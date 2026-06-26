import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CriticReview,
  DocumentationReview,
  GeneratedDocumentType,
  ReviewIssue,
  ReviewMetrics,
} from '../../../domain/workflow';
import { MarkdownValidationResult } from '../../document-generation/services/markdown-validator.service';
import { RawCriticReviewOutput } from '../../document-generation/services/output-parser.service';

@Injectable()
export class ReviewEvaluatorService {
  private readonly logger = new Logger(ReviewEvaluatorService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Evaluates raw AI critic outputs against markdown validation diagnostics,
   * applies scoring penalties, applies configured approval threshold, and returns DocumentationReview.
   */
  public evaluate(
    rawOutput: RawCriticReviewOutput,
    validationResult: MarkdownValidationResult,
    documentType: GeneratedDocumentType,
    metrics: ReviewMetrics,
  ): DocumentationReview {
    const threshold = this.configService.get<number>('CRITIC_APPROVAL_THRESHOLD', 85);

    // Convert markdown diagnostics to ReviewIssue
    const markdownIssues: ReviewIssue[] = [
      ...validationResult.errors.map((err) => ({
        severity: 'CRITICAL' as const,
        category: 'Markdown Structure',
        message: err.message,
        location: err.line ? `Line ${err.line}` : undefined,
      })),
      ...validationResult.warnings.map((warn) => ({
        severity: 'MINOR' as const,
        category: 'Markdown Formatting',
        message: warn.message,
        location: warn.line ? `Line ${warn.line}` : undefined,
      })),
    ];

    const allIssues = [...rawOutput.issues, ...markdownIssues];

    // Calculate score deductions
    const errorPenalty = validationResult.errors.length * 15;
    const warningPenalty = validationResult.warnings.length * 2;
    const finalScore = Math.max(0, Math.min(100, Math.round(rawOutput.score - errorPenalty - warningPenalty)));

    const approved = finalScore >= threshold && validationResult.valid;

    this.logger.debug(
      `[ReviewEvaluator] [${documentType}] RawScore: ${rawOutput.score}, FinalScore: ${finalScore}, Threshold: ${threshold}, Approved: ${approved}`,
    );

    return {
      documentType,
      score: finalScore,
      approved,
      issues: allIssues,
      suggestions: rawOutput.suggestions,
      metrics,
    };
  }

  /**
   * Aggregates individual document reviews into a consolidated CriticReview summary.
   */
  public aggregate(reviews: DocumentationReview[]): CriticReview {
    if (!reviews || reviews.length === 0) {
      return {
        score: 0,
        passed: false,
        approvedCount: 0,
        failedCount: 0,
        totalDocuments: 0,
        issues: ['No document reviews available to aggregate'],
        suggestions: [],
        reviews: [],
      };
    }

    const totalDocuments = reviews.length;
    const approvedCount = reviews.filter((r) => r.approved).length;
    const failedCount = totalDocuments - approvedCount;
    const totalScore = reviews.reduce((sum, r) => sum + r.score, 0);
    const averageScore = Math.round(totalScore / totalDocuments);

    const passed = approvedCount === totalDocuments;

    // Format string issues for legacy wrapper compatibility
    const formattedIssues: string[] = [];
    const allSuggestions = new Set<string>();

    for (const rev of reviews) {
      for (const iss of rev.issues) {
        const locStr = iss.location ? ` (${iss.location})` : '';
        formattedIssues.push(`[${rev.documentType}] [${iss.severity}] ${iss.category}: ${iss.message}${locStr}`);
      }
      for (const sug of rev.suggestions) {
        allSuggestions.add(`[${rev.documentType}] ${sug}`);
      }
    }

    return {
      score: averageScore,
      passed,
      approvedCount,
      failedCount,
      totalDocuments,
      issues: formattedIssues,
      suggestions: Array.from(allSuggestions),
      reviews,
    };
  }
}
