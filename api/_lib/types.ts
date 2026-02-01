// Vercel types for API routes
export interface VercelRequest {
  method: string
  url: string
  headers: { [key: string]: string | string[] | undefined }
  query: { [key: string]: string | string[] }
  body: any
  cookies: { [key: string]: string }
}

export interface VercelResponse {
  status(code: number): VercelResponse
  json(data: any): VercelResponse
  send(data: any): VercelResponse
  setHeader(name: string, value: string | string[]): VercelResponse
  end(): VercelResponse
}
