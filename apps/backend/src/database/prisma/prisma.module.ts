import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

// ---------------------------------------------------------------------------
// PrismaModule
//
// @Global() — marks this module as globally available so feature modules
// (users, repositories, runs, review, pull-requests, notifications…)
// can inject PrismaService without importing PrismaModule in each one.
//
// Registration: imported once in AppModule.
// ---------------------------------------------------------------------------

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
