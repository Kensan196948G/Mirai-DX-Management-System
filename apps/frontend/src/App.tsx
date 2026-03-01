import React, { useEffect } from 'react';

import { useAuth0 } from '@auth0/auth0-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import LoginPage from '@/components/auth/LoginPage';
import PrivateRoute from '@/components/auth/PrivateRoute';
import Layout from '@/components/layout/Layout';
import ProjectDetailPage from '@/features/projects/pages/ProjectDetailPage';
import ProjectsPage from '@/features/projects/pages/ProjectsPage';
import PhotosPage from '@/features/photos/pages/PhotosPage';
import UsersPage from '@/features/users/pages/UsersPage';
import { setTokenGetter } from '@/lib/api';

const TokenSetup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      setTokenGetter(getAccessTokenSilently);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <TokenSetup>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/photos" element={<PhotosPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Routes>
      </TokenSetup>
    </BrowserRouter>
  );
};

export default App;
