import { z } from "zod";

// Base schemas
export const NamespaceSchema = z.string().describe("Namespace in format 'type:id' (e.g., 'user:alice', 'project:frontend')");
export const MemoryIdSchema = z.string().uuid().describe("Unique memory identifier");
export const TimestampSchema = z.string().datetime().describe("ISO datetime string");

// Memory schemas
export const MemorySchema = z.object({
  id: z.string().describe("Unique memory identifier"),
  content: z.string().describe("Memory content"),
  created_at: z.string().describe("Creation timestamp"),
  metadata: z.record(z.any()).optional().describe("Optional metadata")
});

export const CreateMemorySchema = z.object({
  content: z.string().min(1).describe("Memory content to store")
});

export const UpdateMemorySchema = z.object({
  content: z.string().min(1).describe("Updated memory content")
});

// Search schemas
export const SearchRequestSchema = z.object({
  query: z.string().min(1).describe("Search query"),
  namespaces: z.array(NamespaceSchema).describe("Namespaces to search in"),
  dateFrom: z.string().optional().describe("Filter memories from this date"),
  dateTo: z.string().optional().describe("Filter memories to this date")
});

export const VectorSearchMemorySchema = z.object({
  id: z.string().describe("Memory ID"),
  content: z.string().describe("Memory content"),
  score: z.number().describe("Relevance score")
});

export const SearchResultSchema = z.object({
  namespace: NamespaceSchema,
  memories: z.array(VectorSearchMemorySchema)
});

export const SearchResponseSchema = z.object({
  success: z.literal(true),
  query: z.string(),
  results: z.array(SearchResultSchema)
}).or(z.object({
  success: z.literal(false),
  error: z.string()
}));

// Namespace schemas
export const NamespacesSchema = z.object({
  users: z.array(z.string()).describe("Available user namespaces"),
  projects: z.array(z.string()).describe("Available project namespaces"),
  all: z.boolean().describe("Whether 'all' namespace is available")
});

export const NamespacesResponseSchema = z.object({
  success: z.boolean(),
  namespaces: NamespacesSchema
});

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0)
});

export const MemoriesResponseSchema = z.object({
  success: z.boolean(),
  memories: z.array(MemorySchema),
  namespace: NamespaceSchema,
  pagination: PaginationSchema
});

// Generic response schemas
export const SuccessResponseSchema = z.object({
  success: z.literal(true)
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().describe("Error message")
});

// Route parameter schemas
export const NamespaceParamsSchema = z.object({
  namespaceType: z.enum(["user", "project", "all"]).describe("Type of namespace"),
  namespaceId: z.string().describe("Namespace identifier")
});

export const MemoryParamsSchema = z.object({
  memoryId: MemoryIdSchema
});

export const NamespaceMemoryParamsSchema = NamespaceParamsSchema.extend({
  memoryId: MemoryIdSchema
});

// Query parameter schemas
export const MemoriesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default("1").describe("Page number"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("20").describe("Items per page"),
  sortBy: z.enum(["date"]).default("date").describe("Sort field")
});

export const SimpleSearchParamsSchema = z.object({
  namespaceType: z.enum(["user", "project", "all"]).describe("Type of namespace"),
  namespaceId: z.string().describe("Namespace identifier")
});

export const SimpleSearchRequestSchema = z.object({
  query: z.string().min(1).describe("Search query")
});

export const SimpleSearchResponseSchema = z.object({
  success: z.boolean(),
  namespace: NamespaceSchema,
  query: z.string(),
  memories: z.array(MemorySchema.extend({
    score: z.number().describe("Relevance score")
  }))
});
