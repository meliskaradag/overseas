import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api"
});

// Attach JWT if present
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("auth");
  if (stored) {
    try {
      const { token } = JSON.parse(stored);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      // ignore parse errors
    }
  }
  return config;
});

export default api;
