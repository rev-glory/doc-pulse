export interface ApiError {
  message: string;
  statusCode?: number;
}

const API_BASE_URL =
  process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let errorMsg = `API Error: ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody.message) {
        errorMsg = Array.isArray(errBody.message)
          ? errBody.message.join(", ")
          : errBody.message;
      }
    } catch {
      // Ignore JSON parse error
    }
    const error: ApiError = { message: errorMsg, statusCode: response.status };
    throw error;
  }

  return response.json() as Promise<T>;
}
