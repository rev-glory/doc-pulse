// ---------------------------------------------------------------------------
// Database barrel — single import point for all database exports.
//
// Usage inside feature modules:
//   import { PrismaService } from '@/database';
//   import { PrismaModule }  from '@/database';
// ---------------------------------------------------------------------------

export { PrismaModule } from './prisma/prisma.module';
export { PrismaService } from './prisma/prisma.service';
