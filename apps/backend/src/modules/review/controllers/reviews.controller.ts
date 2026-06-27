import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '@/generated/prisma/client';
import { ReviewsService } from '../services/reviews.service';
import { ReviewDecisionDto } from '../dto/review-decision.dto';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async listReviews(@CurrentUser() user: User) {
    return this.reviewsService.listReviews(user);
  }

  @Get(':id')
  async getReviewById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.reviewsService.getReviewById(id, user);
  }

  @Post(':id/approve')
  async approveReview(
    @Param('id') id: string,
    @Body() decision: ReviewDecisionDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewsService.approveReview(id, decision, user);
  }

  @Post(':id/reject')
  async rejectReview(
    @Param('id') id: string,
    @Body() decision: ReviewDecisionDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewsService.rejectReview(id, decision, user);
  }
}
