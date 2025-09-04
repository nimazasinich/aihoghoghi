import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import type { SearchFilters } from '../types';

export const useDocuments = (filters: SearchFilters, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['documents', filters, page, limit],
    queryFn: () => apiService.searchDocuments(filters, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDocument = (id: number) => {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => apiService.getDocument(id),
    enabled: !!id,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiService.getCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useSources = () => {
  return useQuery({
    queryKey: ['sources'],
    queryFn: () => apiService.getSources(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useScrapingStatus = () => {
  return useQuery({
    queryKey: ['scraping-status'],
    queryFn: () => apiService.getScrapingStatus(),
    refetchInterval: 2000, // Update every 2 seconds when scraping
  });
};

export const useStartScraping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (urls?: string[]) => apiService.startScraping(urls),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraping-status'] });
    },
  });
};

export const useStopScraping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiService.stopScraping(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraping-status'] });
    },
  });
};

export const useSystemStats = () => {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: () => apiService.getSystemStats(),
    refetchInterval: 30000, // Update every 30 seconds
  });
};