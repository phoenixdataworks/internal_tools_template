/**
 * CSRF Protection Utilities for client-side use
 */

const CSRF_HEADER = 'x-csrf-token';

/**
 * Fetch a new CSRF token from the server after login
 * @returns The CSRF token that was set in a cookie
 */
export async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/csrf-token', {
      method: 'GET',
      credentials: 'include', // Important to include cookies
    });

    if (!response.ok) {
      console.error('Failed to get CSRF token:', await response.text());
      return null;
    }

    // The token is set as a cookie by the server, no need to handle it here
    return await response.json().then(data => data.token);
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
}

/**
 * Add CSRF token to fetch options
 * @param options Fetch options object
 * @returns Updated fetch options with CSRF token header
 */
export function withCsrfToken(options: RequestInit = {}): RequestInit {
  // Get the CSRF token from the cookie
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrf_token='));
  const csrfToken = csrfCookie ? csrfCookie.trim().substring('csrf_token='.length) : null;

  if (!csrfToken) {
    console.warn('CSRF token not found in cookies. Requests might be rejected.');
    return options;
  }

  // Clone the options to avoid modifying the original
  const newOptions = { ...options };

  // Add the CSRF token to the headers
  newOptions.headers = {
    ...newOptions.headers,
    [CSRF_HEADER]: csrfToken,
  };

  return newOptions;
}

/**
 * Wrapper for fetch that automatically adds CSRF token for state-changing methods
 * @param url URL to fetch
 * @param options Fetch options
 * @returns Fetch response
 */
export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';

  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    options = withCsrfToken(options);
  }

  return fetch(url, {
    ...options,
    credentials: 'include', // Always include cookies
  });
}

/**
 * Initialize CSRF protection after login
 * This should be called once after successful authentication
 */
export async function initCsrfProtection(): Promise<void> {
  const token = await getCsrfToken();
  if (!token) {
    console.warn('Failed to initialize CSRF protection');
  }
}
