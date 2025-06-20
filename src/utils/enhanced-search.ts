import { searchMemories } from "./vectorize"
import { expandQuery } from "./query-expansion"
import { scoreWithVectorStore } from "./relevance-scoring"
import { SessionContext } from "./session-context"
import { getContextualPrompt } from "../mcp-prompts"

export interface EnhancedSearchResult {
    results: Array<{
        id: string
        content: string
        score: number
        adjustedScore: number
        metadata?: any
        reason?: string
    }>
    expandedQueries: string[]
    suggestedSearches: string[]
    contextPrompt?: string | null
}

export const enhancedSearch = async (
    query: string,
    namespace: string,
    env: Env,
    options?: {
        sessionId?: string
        limit?: number
        includePrompts?: boolean
    }
): Promise<EnhancedSearchResult> => {
    const limit = options?.limit || 10
    
    // 1. Get contextual prompt if needed
    const contextPrompt = options?.includePrompts ? 
        getContextualPrompt({ 
            message: query,
            isNewSession: !options.sessionId 
        }) : null
    
    // 2. Expand query using vector store
    const expandedQueries = await expandQuery(query, env)
    
    // 3. Search with all expanded queries
    const allResults = new Map<string, any>()
    
    for (const expandedQuery of expandedQueries) {
        const results = await searchMemories(expandedQuery, namespace, env, limit * 2)
        
        // Merge results, keeping highest scores
        for (const result of results) {
            const existing = allResults.get(result.id)
            if (!existing || result.score > existing.score) {
                allResults.set(result.id, result)
            }
        }
    }
    
    // 4. Load session context for scoring
    let sessionContext = null
    if (options?.sessionId) {
        sessionContext = await SessionContext.load(options.sessionId, env)
        if (!sessionContext) {
            sessionContext = new SessionContext(options.sessionId, env)
        }
        
        // Record this search
        await sessionContext.recordSearch(query, allResults.size)
    }
    
    // 5. Score results with vector store
    const memories = Array.from(allResults.values())
    const scoredResults = await scoreWithVectorStore(
        memories,
        env,
        {
            sessionId: options?.sessionId,
            recentSearches: sessionContext?.getSessionSummary().topSearches
        }
    )
    
    // 6. Get suggested searches based on results
    const suggestedSearches = await getSuggestedSearches(
        query,
        scoredResults.slice(0, 5),
        sessionContext,
        env
    )
    
    // 7. Record viewed memories if session exists
    if (sessionContext) {
        for (const result of scoredResults.slice(0, limit)) {
            await sessionContext.recordMemoryView(result.id)
        }
    }
    
    return {
        results: scoredResults.slice(0, limit).map(r => ({
            id: r.id,
            content: r.content,
            score: r.originalScore,
            adjustedScore: r.adjustedScore,
            metadata: r.metadata,
            reason: r.adjustedScore > r.originalScore ? 
                "Boosted: matches preferences/recent context" : undefined
        })),
        expandedQueries,
        suggestedSearches,
        contextPrompt
    }
}

async function getSuggestedSearches(
    originalQuery: string,
    topResults: any[],
    sessionContext: SessionContext | null,
    env: Env
): Promise<string[]> {
    const suggestions = new Set<string>()
    
    // Add unexplored topics from session
    if (sessionContext) {
        const unexplored = sessionContext.getUnexploredTopics()
        unexplored.forEach(topic => suggestions.add(topic))
    }
    
    // Extract related terms from top results
    for (const result of topResults) {
        if (result.metadata?.tags) {
            const tags = Array.isArray(result.metadata.tags) ? 
                result.metadata.tags : [result.metadata.tags]
            
            tags.forEach((tag: string) => {
                if (tag.startsWith('#') && !originalQuery.includes(tag.substring(1))) {
                    suggestions.add(tag.substring(1))
                }
            })
        }
    }
    
    // Use AI to suggest related queries if available
    try {
        const aiPrompt = `Given the search query "${originalQuery}" and these topics found: ${Array.from(suggestions).join(', ')}, suggest 3 related search queries that would be helpful. Return only the queries, one per line.`
        
        const aiResponse = await env.AI.run("@cf/meta/llama-2-7b-chat-int8", {
            prompt: aiPrompt,
            max_tokens: 50
        })
        
        const aiSuggestions = aiResponse.response
            .split('\n')
            .filter((s: string) => s.trim().length > 0)
            .slice(0, 3)
        
        aiSuggestions.forEach((s: string) => suggestions.add(s.trim()))
    } catch (error) {
        console.error("AI suggestions failed:", error)
    }
    
    return Array.from(suggestions).slice(0, 5)
}