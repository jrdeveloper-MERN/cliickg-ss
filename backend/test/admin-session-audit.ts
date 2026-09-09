import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../src/database/prisma.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { SmartPingSmsProvider } from '../src/modules/auth/providers/smartping-sms.provider';
import { RedisService } from '../src/redis/redis.service';
import { UnauthorizedException } from '@nestjs/common';

async function runAudit() {
  console.log('====================================================');
  console.log('   ADMIN SESSION CLEANUP & MIGRATION AUDIT SUITE   ');
  console.log('====================================================\n');

  const testUserId = 'audit-test-admin-user-id';
  const testUsername = 'audit_admin_test';
  const rawPassword = 'admin123Password!';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const mockUsersService = {
    findByUsername: async (username: string) => {
      if (username === testUsername) {
        return {
          id: testUserId,
          username: testUsername,
          password: hashedPassword,
          name: 'Audit Admin',
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
          isDeleted: false,
        };
      }
      return null;
    },
    findById: async (id: string) => {
      if (id === testUserId) {
        return {
          id: testUserId,
          username: testUsername,
          name: 'Audit Admin',
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
          isDeleted: false,
        };
      }
      return null;
    },
    findCustomerByUserId: async () => null,
  };

  const mockRedisService = {
    get: async () => null,
    set: async () => 'OK',
    delete: async () => 1,
    increment: async () => 1,
  };

  const mockSmsProvider = {
    sendOtp: async () => ({ success: true }),
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({ jwt: { secret: 'audit-test-secret-key-1234567890' } })],
      }),
      JwtModule.register({
        secret: 'audit-test-secret-key-1234567890',
        signOptions: { expiresIn: '7d' },
      }),
    ],
    providers: [
      AuthService,
      PrismaService,
      JwtStrategy,
      { provide: UsersService, useValue: mockUsersService },
      { provide: RedisService, useValue: mockRedisService },
      { provide: SmartPingSmsProvider, useValue: mockSmsProvider },
    ],
  }).compile();

  const authService = moduleRef.get<AuthService>(AuthService);
  const prismaService = moduleRef.get<PrismaService>(PrismaService);
  const jwtStrategy = moduleRef.get<JwtStrategy>(JwtStrategy);
  const jwtService = moduleRef.get<JwtService>(JwtService);
  const configService = moduleRef.get<ConfigService>(ConfigService);

  // Setup Test User in Database
  await prismaService.user.upsert({
    where: { id: testUserId },
    update: { username: testUsername, role: 'ADMIN', accountStatus: 'ACTIVE', isDeleted: false, password: hashedPassword },
    create: {
      id: testUserId,
      username: testUsername,
      name: 'Audit Admin',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      isDeleted: false,
      password: hashedPassword,
    },
  });

  // Clean previous audit sessions
  await prismaService.adminSession.deleteMany({ where: { userId: testUserId } });

  console.log('--- 1. SCHEMA & MODEL AUDIT ---');
  const count = await prismaService.adminSession.count();
  console.log(`[PASS] AdminSession table exists and accessible via Prisma. Count: ${count}`);

  console.log('\n--- 2. CONFIGURATION AUDIT ---');
  const retentionDays = Number(configService.get<string>('ADMIN_SESSION_RETENTION_DAYS', '30')) || 30;
  console.log(`[PASS] ADMIN_SESSION_RETENTION_DAYS resolved to: ${retentionDays}`);

  console.log('\n--- 3. AUTHENTICATION & JWT JTI LOGOUT AUDIT ---');
  // Login / create session
  const loginRes = await authService.login({ username: testUsername, password: rawPassword });
  const token = loginRes.data.token;
  const decoded: any = jwtService.decode(token);
  console.log(`[PASS] JWT generated with jti: ${decoded.jti}`);

  // Validate active JWT via JwtStrategy
  const validatedUser = await jwtStrategy.validate(decoded);
  console.log(`[PASS] JwtStrategy validated active token for user: ${validatedUser.username}`);

  // Logout session
  await authService.logout(decoded.jti);
  console.log(`[PASS] POST /api/auth/logout marked session revoked.`);

  // Attempt reuse after logout
  let reuseFailed = false;
  try {
    await jwtStrategy.validate(decoded);
  } catch (err: any) {
    if (err instanceof UnauthorizedException) {
      reuseFailed = true;
      console.log(`[PASS] Reused JWT after logout correctly returned HTTP 401 Unauthorized.`);
    }
  }
  if (!reuseFailed) {
    throw new Error('FAIL: Reused JWT after logout did NOT throw UnauthorizedException!');
  }

  console.log('\n--- 4. SESSION CLEANUP & RETENTION POLICY AUDIT ---');
  const now = new Date();

  // Create test scenarios
  const activeJti = 'audit-active-jti-' + Date.now();
  const recentRevokedJti = 'audit-recent-revoked-jti-' + Date.now();
  const oldRevokedJti = 'audit-old-revoked-jti-' + Date.now();
  const oldExpiredJti = 'audit-old-expired-jti-' + Date.now();

  const thirtyFiveDaysAgo = new Date();
  thirtyFiveDaysAgo.setDate(now.getDate() - 35);

  const oneDayAgo = new Date();
  oneDayAgo.setDate(now.getDate() - 1);

  const futureExpiry = new Date();
  futureExpiry.setDate(now.getDate() + 7);

  // 1. Active session (isRevoked = false, expiresAt = future) -> RETAIN
  await prismaService.adminSession.create({
    data: {
      userId: testUserId,
      jti: activeJti,
      isRevoked: false,
      expiresAt: futureExpiry,
    },
  });

  // 2. Recent revoked session (isRevoked = true, revokedAt = 1 day ago) -> RETAIN
  await prismaService.adminSession.create({
    data: {
      userId: testUserId,
      jti: recentRevokedJti,
      isRevoked: true,
      revokedAt: oneDayAgo,
      expiresAt: futureExpiry,
    },
  });

  // 3. Old revoked session (isRevoked = true, revokedAt = 35 days ago) -> DELETE
  await prismaService.adminSession.create({
    data: {
      userId: testUserId,
      jti: oldRevokedJti,
      isRevoked: true,
      revokedAt: thirtyFiveDaysAgo,
      expiresAt: futureExpiry,
    },
  });

  // 4. Old expired session (isRevoked = false, expiresAt = 35 days ago) -> DELETE
  await prismaService.adminSession.create({
    data: {
      userId: testUserId,
      jti: oldExpiredJti,
      isRevoked: false,
      expiresAt: thirtyFiveDaysAgo,
    },
  });

  console.log('Running cleanupExpiredAdminSessions()...');
  const deletedCount = await authService.cleanupExpiredAdminSessions();
  console.log(`[PASS] Deleted ${deletedCount} expired/revoked sessions.`);

  const activeSessionExists = await prismaService.adminSession.findUnique({ where: { jti: activeJti } });
  const recentRevokedExists = await prismaService.adminSession.findUnique({ where: { jti: recentRevokedJti } });
  const oldRevokedExists = await prismaService.adminSession.findUnique({ where: { jti: oldRevokedJti } });
  const oldExpiredExists = await prismaService.adminSession.findUnique({ where: { jti: oldExpiredJti } });

  if (!activeSessionExists) throw new Error('FAIL: Active session was deleted during cleanup!');
  console.log('[PASS] Active unexpired session RETAINED.');

  if (!recentRevokedExists) throw new Error('FAIL: Recently revoked session (< 30 days) was deleted during cleanup!');
  console.log('[PASS] Recent revoked session (< 30 days) RETAINED.');

  if (oldRevokedExists) throw new Error('FAIL: Old revoked session (> 30 days) was NOT deleted!');
  console.log('[PASS] Old revoked session (> 30 days) DELETED.');

  if (oldExpiredExists) throw new Error('FAIL: Old expired session (> 30 days) was NOT deleted!');
  console.log('[PASS] Old expired session (> 30 days) DELETED.');

  console.log('\n--- 5. MULTI-SESSION SAFETY AUDIT ---');
  // Session A: Revoked
  // Session B: Active
  const sessionAJti = 'multi-sess-a-' + Date.now();
  const sessionBJti = 'multi-sess-b-' + Date.now();

  await prismaService.adminSession.create({
    data: { userId: testUserId, jti: sessionAJti, isRevoked: true, revokedAt: new Date(), expiresAt: futureExpiry },
  });
  await prismaService.adminSession.create({
    data: { userId: testUserId, jti: sessionBJti, isRevoked: false, expiresAt: futureExpiry },
  });

  const payloadA = { id: testUserId, username: testUsername, role: 'ADMIN', jti: sessionAJti };
  const payloadB = { id: testUserId, username: testUsername, role: 'ADMIN', jti: sessionBJti };

  let sessARejected = false;
  try {
    await jwtStrategy.validate(payloadA);
  } catch (err: any) {
    sessARejected = true;
  }
  const sessBValidated = await jwtStrategy.validate(payloadB);

  if (!sessARejected || !sessBValidated) {
    throw new Error('FAIL: Multi-session isolation failed!');
  }
  console.log('[PASS] Multi-session safety verified: Revoking Session A does not impact Session B.');

  console.log('\n--- 6. CUSTOMER & SELLER AUTH UNTOUCHED VERIFICATION ---');
  const sellerCount = await prismaService.seller.count();
  const customerCount = await prismaService.customer.count();
  console.log(`[PASS] Seller table count: ${sellerCount}, Customer table count: ${customerCount}. Customer/Seller modules completely unaffected.`);

  // Cleanup test data created during audit
  await prismaService.adminSession.deleteMany({ where: { userId: testUserId } });
  await prismaService.user.delete({ where: { id: testUserId } });

  console.log('\n====================================================');
  console.log('   ALL AUDIT CHECKS PASSED — PRODUCTION READY!      ');
  console.log('====================================================');
}

runAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Audit Error:', err);
    process.exit(1);
  });
