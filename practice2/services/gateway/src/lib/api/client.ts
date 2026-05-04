type ApiResponse<T> = { success: boolean; data: T; message?: string };

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers }
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json as { message?: string }).message ?? 'Request failed');
  }
  const data = json as ApiResponse<T>;
  if (!data.success) {
    throw new Error(data.message ?? 'Request failed');
  }
  return data.data;
}
