import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import type { Document, SearchFilters, ScrapingStatus } from '../types';

// Document search hook
export const useDocuments = (filters: SearchFilters, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['documents', filters, page, limit],
    queryFn: () => apiService.searchDocuments(filters, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
};

// Categories hook
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: apiService.getCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });
};

// Sources hook
export const useSources = () => {
  return useQuery({
    queryKey: ['sources'],
    queryFn: apiService.getSources,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });
};

// System stats hook
export const useSystemStats = () => {
  return useQuery({
    queryKey: ['systemStats'],
    queryFn: apiService.getSystemStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });
};

// Scraping status hook
export const useScrapingStatus = () => {
  return useQuery({
    queryKey: ['scrapingStatus'],
    queryFn: apiService.getScrapingStatus,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 0,
    retry: 2
  });
};

// Start scraping mutation
export const useStartScraping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (urls?: string[]) => apiService.startScraping(urls),
    onSuccess: () => {
      // Invalidate and refetch scraping status
      queryClient.invalidateQueries({ queryKey: ['scrapingStatus'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
    }
  });
};

// Stop scraping mutation
export const useStopScraping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.stopScraping,
    onSuccess: () => {
      // Invalidate and refetch scraping status
      queryClient.invalidateQueries({ queryKey: ['scrapingStatus'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
    }
  });
};

// Document classification hook
export const useClassifyDocument = () => {
  return useMutation({
    mutationFn: (text: string) => apiService.classifyDocument(text)
  });
};

// Single document hook
export const useDocument = (id: string) => {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => apiService.getDocument(parseInt(id)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
};