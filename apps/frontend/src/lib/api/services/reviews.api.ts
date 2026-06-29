import { apiClient } from "../client";
import type { ReviewDetail } from "@docpulse/shared-types";

export const ReviewsApi = {
  listReviews: async (): Promise<ReviewDetail[]> => {
    return apiClient<ReviewDetail[]>("/reviews");
  },

  getReviewById: async (id: string): Promise<ReviewDetail> => {
    return apiClient<ReviewDetail>(`/reviews/${id}`);
  },

  approveReview: async (
    id: string,
    comment?: string,
  ): Promise<{ message: string }> => {
    return apiClient<{ message: string }>(`/reviews/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    });
  },

  rejectReview: async (
    id: string,
    comment?: string,
  ): Promise<{ message: string }> => {
    return apiClient<{ message: string }>(`/reviews/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    });
  },
};
