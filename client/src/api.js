const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getToken() {
  return localStorage.getItem('campus_vote_token');
}

export function setSession(session) {
  localStorage.setItem('campus_vote_token', session.token);
  localStorage.setItem('campus_vote_user', JSON.stringify(session.user));
}

export function getUser() {
  const raw = localStorage.getItem('campus_vote_user');
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem('campus_vote_token');
  localStorage.removeItem('campus_vote_user');
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}
