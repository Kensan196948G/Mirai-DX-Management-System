export interface ApiResponse<T> {
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  auth0Id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'member';
  organizationId: string;
  organization?: Organization;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  organizationId: string;
  organization?: Organization;
  createdById: string;
  createdBy?: User;
  photoCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  projectId: string;
  project?: Project;
  uploadedById: string;
  uploadedBy?: User;
  takenAt?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
