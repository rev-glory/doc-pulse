import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import {
  createGeneratedDocument,
  GeneratedDocument,
  GeneratedDocumentMetrics,
  GeneratedDocumentType,
} from '../../../domain/workflow';

export interface RawDocumentOutput {
  title?: string;
  path?: string;
  markdown?: string;
  summary?: string;
}

@Injectable()
export class OutputParserService {
  private readonly logger = new Logger(OutputParserService.name);

  /**
   * Parses structured LLM JSON responses, recovers malformed formatting fences,
   * validates required fields, normalizes markdown line endings, and maps to GeneratedDocument.
   */
  public parse(
    rawText: string,
    documentType: GeneratedDocumentType,
    metrics?: GeneratedDocumentMetrics,
  ): GeneratedDocument {
    if (!rawText || typeof rawText !== 'string') {
      throw new UnprocessableEntityException(`[OutputParser] Empty or invalid LLM output received for ${documentType}`);
    }

    const cleanedJson = this.recoverJson(rawText);
    let parsed: RawDocumentOutput;

    try {
      parsed = JSON.parse(cleanedJson);
    } catch (error) {
      this.logger.error(`[OutputParser] Failed to parse JSON for ${documentType}:`, rawText);
      throw new UnprocessableEntityException(
        `[OutputParser] Malformed JSON structure for ${documentType}: ${error instanceof Error ? error.message : 'Syntax error'}`,
      );
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new UnprocessableEntityException(`[OutputParser] Parsed LLM response is not an object for ${documentType}`);
    }

    const missingFields: string[] = [];
    if (!parsed.title || typeof parsed.title !== 'string') missingFields.push('title');
    if (!parsed.path || typeof parsed.path !== 'string') missingFields.push('path');
    if (!parsed.markdown || typeof parsed.markdown !== 'string') missingFields.push('markdown');
    if (!parsed.summary || typeof parsed.summary !== 'string') missingFields.push('summary');

    if (missingFields.length > 0) {
      throw new UnprocessableEntityException(
        `[OutputParser] Missing required fields [${missingFields.join(', ')}] in LLM response for ${documentType}`,
      );
    }

    const normalizedMarkdown = parsed.markdown!.replace(/\r\n/g, '\n').trim();
    const normalizedSummary = parsed.summary!.replace(/\r\n/g, '\n').trim();

    return createGeneratedDocument({
      id: `doc-${crypto.randomUUID()}`,
      title: parsed.title!.trim(),
      path: parsed.path!.trim(),
      markdown: normalizedMarkdown,
      summary: normalizedSummary,
      type: documentType,
      metrics,
    });
  }

  /**
   * Recovers JSON payload from markdown code blocks or wrapped text.
   */
  public recoverJson(rawText: string): string {
    let trimmed = rawText.trim();

    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenceMatch && fenceMatch[1]) {
      trimmed = fenceMatch[1].trim();
    }

    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      const firstBrace = trimmed.indexOf('{');
      const lastBrace = trimmed.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        trimmed = trimmed.substring(firstBrace, lastBrace + 1).trim();
      }
    }

    return trimmed;
  }
}
