import { Module } from '@nestjs/common';

/**
 * No controller here on purpose. Better Auth owns /api/auth/* directly
 * (mounted in main.ts via toNodeHandler) — register, login, refresh,
 * logout, session, and org-switching all come from its handler, not
 * from a NestJS controller.
 *
 * This module exists so other modules can still `imports: [AuthModule]`
 * without churn, and as a home if we add auth-adjacent providers later
 * (e.g. a service wrapping auth.api.* calls for use in other services).
 */
@Module({})
export class AuthModule {}
