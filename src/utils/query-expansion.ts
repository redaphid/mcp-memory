import { searchMemories } from "../utils/vectorize"

const EXPANSION_NAMESPACE = "system:query-expansions"

export const expandQuery = async (query: string, env: Env): Promise<string[]> => {
    const normalizedQuery = query.toLowerCase()
    const expansions = new Set([normalizedQuery])
    
    try {
        // Search for query expansions in the vector store
        const results = await searchMemories(normalizedQuery, EXPANSION_NAMESPACE, env, 10)
        
        // Add related queries from the results
        results.forEach(result => {
            if (result.content) {
                // Parse expansion data stored as JSON
                try {
                    const expansionData = JSON.parse(result.content)
                    if (Array.isArray(expansionData.relatedQueries)) {
                        expansionData.relatedQueries.forEach((q: string) => expansions.add(q.toLowerCase()))
                    }
                } catch {
                    // If not JSON, treat as plain text expansion
                    expansions.add(result.content.toLowerCase())
                }
            }
        })
        
        // Also search in the main namespace for highly related content
        const mainResults = await searchMemories(normalizedQuery, "all", env, 5)
        
        // Extract key terms from highly relevant results
        mainResults.forEach(result => {
            if (result.score > 0.8 && result.metadata?.tags) {
                // Add high-confidence tags as expansions
                const tags = result.metadata.tags
                if (Array.isArray(tags)) {
                    tags.forEach(tag => {
                        if (tag.startsWith('#')) {
                            expansions.add(tag.substring(1).toLowerCase())
                        }
                    })
                }
            }
        })
        
    } catch (error) {
        console.error("Error expanding query:", error)
    }
    
    return Array.from(expansions)
}

export const storeQueryExpansion = async (
    query: string, 
    relatedQueries: string[], 
    env: Env
): Promise<void> => {
    const expansionData = {
        originalQuery: query,
        relatedQueries: relatedQueries,
        createdAt: new Date().toISOString()
    }
    
    // Store in both D1 and Vectorize
    const id = `expansion-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    await env.DB.prepare(
        "INSERT INTO memories (id, content, namespace, created_at) VALUES (?, ?, ?, ?)"
    ).bind(
        id,
        JSON.stringify(expansionData),
        EXPANSION_NAMESPACE,
        new Date().toISOString()
    ).run()
    
    // Also store in Vectorize for similarity search
    await env.VECTORIZE.insert([{
        id: id,
        values: [], // Will be populated by AI
        namespace: EXPANSION_NAMESPACE,
        metadata: {
            type: "query-expansion",
            originalQuery: query,
            relatedCount: relatedQueries.length
        }
    }])
}