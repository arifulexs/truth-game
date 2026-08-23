const TOKEN_KEY = 'truth-game:token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach the server. Check your connection and try again.");
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'ERROR', data.message || 'Something went wrong.');
  }
  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body, auth: false }),
  login: (body) => request('/auth/login', { method: 'POST', body, auth: false }),
  me: () => request('/auth/me'),
  updateDisplayName: (displayName) => request('/auth/me/display-name', { method: 'PATCH', body: { displayName } }),
  categories: () => request('/questions/categories', { auth: false }),
  createRoom: (categories) => request('/rooms', { method: 'POST', body: { categories } }),
  joinRoom: (code) => request(`/rooms/${encodeURIComponent(code)}/join`, { method: 'POST', body: {} })
};
