process.env.NODE_ENV = 'test';

process.env.JWT_SECRET ??= 'test-access-secret-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET ??=
  'test-refresh-secret-minimum-32-characters-long';
process.env.BYOK_ENCRYPTION_KEY ??=
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
