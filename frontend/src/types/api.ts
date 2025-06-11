export interface Memory {
  id: string;
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface VectorSearchMemory {
  id: string;
  content: string;
  score: number;
}

export interface Namespace {
  users: string[];
  projects: string[];
  all: boolean;
}

export interface NamespacesResponse {
  success: boolean;
  namespaces: Namespace;
}

export interface SearchResult {
  namespace: string;
  memories: VectorSearchMemory[];
}

export interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MemoriesResponse {
  success: boolean;
  memories: Memory[];
  namespace: string;
  pagination: Pagination;
}

export interface ApiError {
  success: false;
  error: string;
}

export type NamespaceType = 'user' | 'project' | 'all';

export interface TabType {
  id: 'recent' | 'search' | 'browse';
  label: string;
  icon: string;
}
