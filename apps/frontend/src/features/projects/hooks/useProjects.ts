import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiClient from '@/lib/api';
import type { ApiResponse, Project } from '@/types';

const PROJECTS_KEY = 'projects';

export const useProjects = () => {
  return useQuery({
    queryKey: [PROJECTS_KEY],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Project[]>>('/projects');
      return res.data.data;
    },
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: [PROJECTS_KEY, id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Project>>(`/projects/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiClient.post<ApiResponse<Project>>('/projects', data);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PROJECTS_KEY] });
    },
  });
};

export const useUpdateProject = (id: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Pick<Project, 'name' | 'description' | 'status'>>) => {
      const res = await apiClient.patch<ApiResponse<Project>>(`/projects/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PROJECTS_KEY] });
    },
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PROJECTS_KEY] });
    },
  });
};
