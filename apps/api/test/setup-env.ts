process.env.NODE_ENV = 'test';

process.env.BETTER_AUTH_SECRET ??=
  'test-better-auth-secret-minimum-32-characters-long';
process.env.BYOK_ENCRYPTION_KEY ??=
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Integration tests must never contact a developer's configured Apify account.
delete process.env.APIFY_API_TOKEN;
