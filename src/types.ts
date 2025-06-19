import { z } from "zod"

// Super lean schemas - just the fields we actually test
const ApiResponse = z.object({
    success: z.boolean(),
    error: z.string().optional()
})

const DbInfoResponse = ApiResponse.extend({
    tableInfo: z.any(),
    count: z.number()
})

const NamespacesResponse = ApiResponse.extend({
    namespaces: z.object({
        users: z.array(z.string()),
        projects: z.array(z.string())
    })
})

const MemoriesResponse = ApiResponse.extend({
    memories: z.array(
        z.object({
            content: z.string(),
            id: z.string()
        })
    )
})

const SearchResponse = ApiResponse.extend({
    query: z.string(),
    results: z.array(z.any()),
    namespace: z.string().optional()
})

const VectorResponse = ApiResponse.extend({
    vectorId: z.string(),
    embeddingLength: z.number(),
    searchResults: z.object({
        count: z.number(),
        matches: z.array(
            z.object({
                content: z.string(),
                score: z.number()
            })
        )
    })
})

const McpResponse = z.object({
    result: z.object({
        tools: z.array(z.object({ name: z.string() })).optional(),
        content: z.array(z.object({ text: z.string() })).optional()
    })
})

// Export schemas for direct use
export { SearchResponse }

// Export inferred Types for use in application code
export type DbInfoResponse = z.infer<typeof DbInfoResponse>
export type NamespacesResponse = z.infer<typeof NamespacesResponse>
export type MemoriesResponse = z.infer<typeof MemoriesResponse>
export type SearchResponse = z.infer<typeof SearchResponse>
export type VectorResponse = z.infer<typeof VectorResponse>
export type McpResponse = z.infer<typeof McpResponse>

// Simple parsing helpers for tests
export const parseDbInfo = (response: Response) => response.json().then((data) => DbInfoResponse.parse(data))
export const parseNamespaces = (response: Response) => response.json().then((data) => NamespacesResponse.parse(data))
export const parseMemories = (response: Response) => response.json().then((data) => MemoriesResponse.parse(data))
export const parseSearch = (response: Response) => response.json().then((data) => SearchResponse.parse(data))
export const parseVector = (response: Response) => response.json().then((data) => VectorResponse.parse(data))
export const parseMcp = (response: Response) => response.json().then((data) => McpResponse.parse(data))
