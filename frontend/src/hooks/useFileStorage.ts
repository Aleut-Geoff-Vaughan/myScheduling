import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  uploadFile,
  listFiles,
  deleteFile,
  downloadFile,
  type FileListResponse,
} from '../services/fileStorageService';
import toast from 'react-hot-toast';

export const useFiles = (category?: string) => {
  return useQuery<FileListResponse>({
    queryKey: ['files', category],
    queryFn: () => listFiles(category),
  });
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      category,
      onProgress,
    }: {
      file: File;
      category?: string;
      onProgress?: (progress: number) => void;
    }) => {
      return uploadFile(file, category, onProgress);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files', variables.category] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File uploaded successfully');
    },
    onError: (error: unknown) => {
      const message =
        (error && typeof error === 'object' && 'response' in error &&
         error.response && typeof error.response === 'object' && 'data' in error.response &&
         error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data)
          ? String(error.response.data.message)
          : 'Failed to upload file';
      toast.error(message);
    },
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File deleted successfully');
    },
    onError: (error: unknown) => {
      const message =
        (error && typeof error === 'object' && 'response' in error &&
         error.response && typeof error.response === 'object' && 'data' in error.response &&
         error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data)
          ? String(error.response.data.message)
          : 'Failed to delete file';
      toast.error(message);
    },
  });
};

export const useDownloadFile = () => {
  return useMutation({
    mutationFn: (fileId: string) => downloadFile(fileId),
    onError: (error: unknown) => {
      const message =
        (error && typeof error === 'object' && 'response' in error &&
         error.response && typeof error.response === 'object' && 'data' in error.response &&
         error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data)
          ? String(error.response.data.message)
          : 'Failed to download file';
      toast.error(message);
    },
  });
};
