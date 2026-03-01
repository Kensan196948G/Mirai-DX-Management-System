import React, { useState } from 'react';

import { useParams } from 'react-router-dom';

import LoadingSpinner from '@/components/ui/LoadingSpinner';

import PhotoList from '../components/PhotoList';
import PhotoMap from '../components/PhotoMap';
import PhotoUpload from '../components/PhotoUpload';
import { usePhotos, useUploadPhoto } from '../hooks/usePhotos';

type Tab = 'list' | 'map';

const PhotosPage: React.FC = () => {
  const { id: projectId = '' } = useParams<{ id: string }>();
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('list');

  const { data: photos = [], isLoading, error } = usePhotos(projectId);
  const { mutate: upload, isPending: isUploading } = useUploadPhoto(projectId);

  const handleUpload = (files: File[]) => {
    files.forEach((file) => {
      upload(file, {
        onSuccess: () => {
          if (files.indexOf(file) === files.length - 1) {
            setShowUpload(false);
          }
        },
      });
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        写真の読み込みに失敗しました
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">写真管理</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          写真を追加
        </button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['list', 'map'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'list' ? '一覧' : '地図'}
          </button>
        ))}
      </div>

      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">写真をアップロード</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <PhotoUpload onUpload={handleUpload} isUploading={isUploading} />
          </div>
        </div>
      )}

      {activeTab === 'list' ? <PhotoList photos={photos} /> : <PhotoMap photos={photos} />}
    </div>
  );
};

export default PhotosPage;
