export class ApiError extends Error {
  constructor(message: string, public status: number, public retryAfter: number = 0) { super(message) }
}

export async function request<T>(url: string, method = 'GET'): Promise<T> {
  let response: Response
  try {
    if (!navigator.onLine) throw new Error('offline')
    response = await fetch(url, { method, cache: 'no-store', signal: AbortSignal.timeout(30000) })
  } catch {
    throw new ApiError('Нет связи с сервером расписания', 0)
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const detail = body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string'
      ? body.detail : 'Не удалось загрузить расписание. Попробуйте ещё раз'
    throw new ApiError(detail, response.status, Number(response.headers.get('Retry-After') || 0))
  }
  try {
    return await response.json() as T
  } catch {
    throw new ApiError('Сервер вернул некорректные данные расписания', 502)
  }
}
