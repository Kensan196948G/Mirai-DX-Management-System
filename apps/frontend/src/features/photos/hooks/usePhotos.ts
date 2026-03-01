import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiClient from '@/lib/api';
import type { ApiResponse, Photo } from '@/types';

const PHOTOS_KEY = 'photos';

export const usePhotos = (projectId: string) => {
  return useQuery({
    queryKey: [PHOTOS_KEY, projectId],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Photo[]>>(`/projects/${projectId}/photos`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
};

export const useUploadPhoto = (projectId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<ApiResponse<Photo>>(
        `/projects/${projectId}/photos`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PHOTOS_KEY, projectId] });
    },
  });
};
