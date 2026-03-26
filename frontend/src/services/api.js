import axios from 'axios';

const normalizeApiUrl = (rawUrl) => {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return '';
  }

  const trimmed = rawUrl.trim();

  if (typeof window === 'undefined') {
    return trimmed;
  }

  // Avoid loopback URLs in browser when app is accessed from a remote host.
  if (/(localhost|127\.0\.0\.1)/i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      parsed.hostname = window.location.hostname;
      return parsed.toString().replace(/\/$/, '');
    }
    catch (_err) {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      return `${protocol}//${window.location.hostname}:5000/api`;
    }
  }

  return trimmed;
};

const resolveApiBaseUrl = () => {
  const envUrl = normalizeApiUrl(import.meta.env.VITE_API_URL);
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.hostname}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

const API = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth services
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
};

// User services
export const userAPI = {
  getAll: () => API.get('/users'),
  getById: (id) => API.get(`/users/${id}`),
  update: (id, data) => API.put(`/users/${id}`, data),
  delete: (id) => API.delete(`/users/${id}`),
};

// Member services
export const memberAPI = {
  getAll: () => API.get('/members'),
  getPublic: () => API.get('/members/public'),
  create: (data) => API.post('/members', data),
  getById: (id) => API.get(`/members/${id}`),
  update: (id, data) => API.put(`/members/${id}`, data),
  delete: (id) => API.delete(`/members/${id}`),
};

// Court services
export const courtAPI = {
  getAll: () => API.get('/courts'),
  create: (data) => API.post('/courts', data),
  getById: (id) => API.get(`/courts/${id}`),
  update: (id, data) => API.put(`/courts/${id}`, data),
  delete: (id) => API.delete(`/courts/${id}`),
};

// Booking services
export const bookingAPI = {
  getAll: () => API.get('/bookings'),
  create: (data) => API.post('/bookings', data),
  update: (id, data) => API.put(`/bookings/${id}`, data),
  delete: (id) => API.delete(`/bookings/${id}`),
};

// Financial services
export const financialAPI = {
  getAll: (startDate, endDate, type) => API.get('/financial', {
    params: { startDate, endDate, type },
  }),
  create: (data) => API.post('/financial', data),
  update: (id, data) => API.put(`/financial/${id}`, data),
  delete: (id) => API.delete(`/financial/${id}`),
  getStats: (startDate, endDate, type) => API.get('/financial/stats/monthly', {
    params: { startDate, endDate, type },
  }),
};

// Dashboard services
export const dashboardAPI = {
  getStats: (startDate, endDate) => API.get('/dashboard/stats', {
    params: { startDate, endDate },
  }),
};

// Tournament services
export const tournamentAPI = {
  getAll: () => API.get('/tournaments'),
  getById: (id) => API.get(`/tournaments/${id}`),
  create: (data) => API.post('/tournaments', data),
  update: (id, data) => API.put(`/tournaments/${id}`, data),
  updateParticipants: (id, participants) => API.put(`/tournaments/${id}/participants`, { participants }),
  delete: (id) => API.delete(`/tournaments/${id}`),
  getMemberHistory: (memberId) => API.get(`/tournaments/member/${memberId}`),
  getPublicMemberHistory: (memberId) => API.get(`/tournaments/public/member/${memberId}`),
};
