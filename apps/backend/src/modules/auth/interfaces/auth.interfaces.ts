// ---------------------------------------------------------------------------
// Auth Module Interfaces
// ---------------------------------------------------------------------------

import type { User } from '@/generated/prisma/client';

export interface AuthenticatedRequest extends Request {
  user: User;
}
