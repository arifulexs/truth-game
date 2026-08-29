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
  createRoom: (categories, questionCount) => request('/rooms', { method: 'POST', body: { categories, questionCount } }),
  joinRoom: (code) => request(`/rooms/${encodeURIComponent(code)}/join`, { method: 'POST', body: {} }),
  inviteToRoom: (code, toUserId) => request(`/rooms/${encodeURIComponent(code)}/invite`, { method: 'POST', body: { toUserId } }),
  searchUsers: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),
  friends: () => request('/friends'),
  sendFriendRequest: (toUserId) => request('/friends/requests', { method: 'POST', body: { toUserId } }),
  acceptFriendRequest: (id) => request(`/friends/requests/${encodeURIComponent(id)}/accept`, { method: 'POST' }),
  declineFriendRequest: (id) => request(`/friends/requests/${encodeURIComponent(id)}/decline`, { method: 'POST' }),
  removeFriend: (userId) => request(`/friends/${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  // Push notifications
  vapidPublicKey: () => request('/push/vapid-public-key', { auth: false }),
  subscribePush: (subscription) => request('/push/subscribe', { method: 'POST', body: { subscription } }),
  unsubscribePush: (endpoint) => request('/push/unsubscribe', { method: 'POST', body: { endpoint } }),

  // Admin — question bank
  adminCategories: () => request('/admin/categories'),
  adminCreateCategory: (label, description) => request('/admin/categories', { method: 'POST', body: { label, description } }),
  adminUpdateCategory: (key, label, description) => request(`/admin/categories/${encodeURIComponent(key)}`, { method: 'PATCH', body: { label, description } }),
  adminDeleteCategory: (key) => request(`/admin/categories/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  adminQuestionsForCategory: (key) => request(`/admin/categories/${encodeURIComponent(key)}/questions`),
  adminCreateQuestion: (categoryKey, text) => request('/admin/questions', { method: 'POST', body: { categoryKey, text } }),
  adminUpdateQuestion: (id, text) => request(`/admin/questions/${encodeURIComponent(id)}`, { method: 'PATCH', body: { text } }),
  adminDeleteQuestion: (id) => request(`/admin/questions/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Admin — badges
  adminBadges: () => request('/admin/badges'),
  adminCreateBadge: (label, emoji, color, animated) => request('/admin/badges', { method: 'POST', body: { label, emoji, color, animated } }),
  adminDeleteBadge: (key) => request(`/admin/badges/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  adminSearchUsers: (q) => request(`/admin/users/search?q=${encodeURIComponent(q)}`),
  adminAssignBadge: (userId, badgeKey) => request(`/admin/users/${encodeURIComponent(userId)}/badges`, { method: 'POST', body: { badgeKey } }),
  adminRemoveBadge: (userId, badgeKey) => request(`/admin/users/${encodeURIComponent(userId)}/badges/${encodeURIComponent(badgeKey)}`, { method: 'DELETE' })
};
