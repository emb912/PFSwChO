// API config
const BASE = "http://127.0.0.1:8000";

const ENDPOINTS = {
  notes: `${BASE}/api/notes/`,
  login: `${BASE}/api/auth/login/`,
  register: `${BASE}/api/auth/register/`,
};

// token storage
function getAuth() {
  return {
    token: localStorage.getItem("token"),
    username: localStorage.getItem("username"),
  };
}

function setAuth(token, username) {
  localStorage.setItem("token", token);
  localStorage.setItem("username", username);
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
}

function authHeaders() {
  const { token } = getAuth();
  return token ? { Authorization: `Token ${token}` } : {};
}

// generic request helper
async function apiFetch(url, { method = "GET", body = null, needsAuth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (needsAuth) Object.assign(headers, authHeaders());

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.detail)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
