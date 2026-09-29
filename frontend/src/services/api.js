const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

export async function api(path, options = {}) {
  const token = sessionStorage.getItem('donation_access_token');
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Cannot reach the backend. Confirm Flask is running at the configured API URL.');
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (response.status === 401 && path !== '/auth/login') {
    window.dispatchEvent(new Event('auth:unauthorized'));
  }
  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }
  return payload;
}

export function dataOf(payload) {
  return payload && Object.hasOwn(payload, 'data') ? payload.data : payload;
}

export function jsonBody(value) {
  return JSON.stringify(value);
}