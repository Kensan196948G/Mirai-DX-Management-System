import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiClient from '@/lib/api';
import type { ApiResponse, User } from '@/types';

const USERS_KEY = 'users';

export const useUsers = () => {
  return useQuery({
    queryKey: [USERS_KEY],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<User[]>>('/users');
      return res.data.data;
    },
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: [USERS_KEY, id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
};

export const useCreateUser = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Pick<User, 'name' | 'email' | 'auth0Id' | 'organizationId'>) => {
      const res = await apiClient.post<ApiResponse<User>>('/users', data);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};

export const useUpdateUser = (id: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Pick<User, 'name' | 'email' | 'isActive'>>) => {
      const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
};
