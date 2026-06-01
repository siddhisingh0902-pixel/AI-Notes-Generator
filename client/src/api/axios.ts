import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5001/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('sa_token');
      localStorage.removeItem('sa_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;