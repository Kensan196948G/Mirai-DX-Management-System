import axios from 'axios';

import { queryClient } from './queryClient';

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let getAccessTokenSilently: (() => Promise<string>) | null = null;

export const setTokenGetter = (fn: () => Promise<string>) => {
  getAccessTokenSilently = fn;
};

apiClient.interceptors.request.use(async (config) => {
  if (getAccessTokenSilently) {
    try {
      const token = await getAccessTokenSilently();
      config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // Token fetch failed, proceed without auth
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      queryClient.clear();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
