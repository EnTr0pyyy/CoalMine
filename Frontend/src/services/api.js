// Base API client.
//
// This is the ONLY module that should know about the network layer.
// Every feature service (flagService, mineService, ...) is built on
// top of `apiClient`, and every page/component talks to a feature
// service — never to fetch()/axios or an endpoint string directly.
//
// Today, USE_MOCKS is true and feature services resolve from
// src/data/mockData.js. Flipping USE_MOCKS to false (or unsetting it
// via env) switches every service to real HTTP calls through
// apiClient without touching a single page component.

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // 1. If explicit relative path or custom external URL is configured, honor it:
  if (envUrl && envUrl.startsWith('/')) {
    return envUrl;
  }
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // 2. In browser environments:
  // Using relative '/api' leverages Vite's reverse proxy in dev & preview.
  // This automatically routes through the active host/origin (e.g. http://192.168.x.x:5173/api),
  // preventing CORS rejections, Private Network Access blocks, and localhost port 5000 connection failures
  // when accessed across LAN/Wi-Fi devices.
  return '/api';
}

export const API_BASE_URL = getApiBaseUrl();

// Toggle for the whole app. Reads from VITE_USE_MOCKS (default: false when not set to 'true').
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

// Simulates realistic network latency for mock responses so loading
// states are actually visible during the SIH demo instead of
// flashing instantly.
export function mockDelay(data, ms = 350) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

function getClientUserId() {
  try {
    const rawUser = localStorage.getItem('minegov_auth_user');
    const user = rawUser ? JSON.parse(rawUser) : null;
    return user?.id ? String(user.id) : '';
  } catch (_) {
    return '';
  }
}

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, headers, signal } = {}) {
  const token = localStorage.getItem('minegov_auth_token');
  const userId = getClientUserId();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = API_BASE_URL.endsWith('/')
    ? `${API_BASE_URL.slice(0, -1)}${cleanPath}`
    : `${API_BASE_URL}${cleanPath}`;

  const response = await fetch(targetUrl, {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && token) {
      console.warn('[apiClient] 401 Unauthorized received. Clearing expired session token.');
      localStorage.removeItem('minegov_auth_token');
      localStorage.removeItem('minegov_auth_user');
      window.dispatchEvent(new Event('storage'));
    }
    throw new ApiError(payload?.message || response.statusText, response.status, payload);
  }

  return payload;
}

async function requestForm(path, formData, { method = 'POST', headers, signal } = {}) {
  const token = localStorage.getItem('minegov_auth_token');
  const userId = getClientUserId();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = API_BASE_URL.endsWith('/')
    ? `${API_BASE_URL.slice(0, -1)}${cleanPath}`
    : `${API_BASE_URL}${cleanPath}`;

  const response = await fetch(targetUrl, {
    method,
    signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...headers,
    },
    body: formData,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && token) {
      console.warn('[apiClient] 401 Unauthorized received. Clearing expired session token.');
      localStorage.removeItem('minegov_auth_token');
      localStorage.removeItem('minegov_auth_user');
      window.dispatchEvent(new Event('storage'));
    }
    throw new ApiError(payload?.message || response.statusText, response.status, payload);
  }

  return payload;
}

export const apiClient = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  postForm: (path, formData, opts) => requestForm(path, formData, { ...opts, method: 'POST' }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export { ApiError };
