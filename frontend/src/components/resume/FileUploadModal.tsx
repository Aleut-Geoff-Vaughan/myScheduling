import { useState, useCallback } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatFileSize } from '../../services/fileStorageService';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<void>;
  maxSizeBytes?: number;
  isUploading?: boolean;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function FileUploadModal({
  isOpen,
  onClose,
  onUpload,
  maxSizeBytes = MAX_FILE_SIZE,
  isUploading,
}: FileUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${formatFileSize(maxSizeBytes)} limit`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await onUpload(selectedFile, setUploadProgress);
      handleClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upload File</h2>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">Drag and drop a file here, or</p>
            <label className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-700 font-medium">
                browse to select
              </span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
            <p className="mt-2 text-sm text-gray-500">
              Max file size: {formatFileSize(maxSizeBytes)}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <FileText className="w-10 h-10 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="text-gray-900 font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>
    </div>
  );
}
