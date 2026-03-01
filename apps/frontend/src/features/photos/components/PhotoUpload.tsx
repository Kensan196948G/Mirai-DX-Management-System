import React, { useCallback } from 'react';

import { useDropzone } from 'react-dropzone';

interface PhotoUploadProps {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onUpload, isUploading }) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
      }
    },
    [onUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/heic': ['.heic'],
    },
    multiple: true,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
      } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <svg
        className="w-10 h-10 text-gray-400 mx-auto mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      {isUploading ? (
        <p className="text-sm text-blue-600 font-medium">アップロード中...</p>
      ) : isDragActive ? (
        <p className="text-sm text-blue-600 font-medium">ここにドロップしてください</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 font-medium">
            クリックまたはドラッグ&ドロップで写真を選択
          </p>
          <p className="text-xs text-gray-400 mt-1">JPEG, PNG, HEIC 対応（最大 10MB）</p>
        </>
      )}
    </div>
  );
};

export default PhotoUpload;
