export const AUTH_COOKIE = {
  accessToken: "careeros_access_token",
  refreshToken: "careeros_refresh_token",
} as const;

export function getApiBaseUrl(): string {
  return (
    process.env.CAREEROS_API_URL ??
    process.env.NEXT_PUBLIC_CAREEROS_API_URL ??
    "http://localhost:3001"
  );
}
