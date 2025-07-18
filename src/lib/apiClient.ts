import { getCsrfToken } from '@/utils/csrf';

export async function apiFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();

  // Only attach CSRF token for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCsrfToken();
    console.log('token', token);
    init.headers = {
      ...(init.headers || {}),
      'x-csrf-token': token ?? '',
    };
  }

  // Always include credentials for CSRF cookie
  init.credentials = 'include';

  return fetch(input, init);
}
