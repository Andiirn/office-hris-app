// src/core/api/client.ts
import axios from 'axios';
import { tokenStore } from '../auth/token-store';
import { useAuthStore } from '../../stores/auth.store';

const rawBaseURL = process.env.EXPO_PUBLIC_API_URL || '';
const baseURL = `${rawBaseURL.replace(/\/$/, '')}/api/v1`;

export const api = axios.create({
  baseURL,
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
      await tokenStore.clearTokens();
      useAuthStore.setState({ user: null, isLoggedIn: false });
    }
    return Promise.reject(err);
  }
);
