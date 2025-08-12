export function getAuthHeaders(includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = {}
  
  if (includeContentType) {
    headers["Content-Type"] = "application/json"
  }
  
  // Add Cloudflare Access headers if available
  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID
    headers["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET
  }
  
  return headers
}