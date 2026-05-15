// src/core/api/client.ts
import axios from 'axios';
import { tokenStore } from '../auth/token-store';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // TODO: Implement refresh logic or logout in future tasks
      // For now, we'll just propagate the error
    }
    return Promise.reject(err);
  }
);
