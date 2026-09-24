export function getApiBaseUrl(): string {
  return (
    process.env.CAREEROS_API_URL ??
    process.env.NEXT_PUBLIC_CAREEROS_API_URL ??
    "http://localhost:3001"
  );
}
