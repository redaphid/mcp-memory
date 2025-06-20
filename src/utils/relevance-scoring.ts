const SCORING_NAMESPACE = "system:scoring-factors"

interface ScoredMemory {
    id: string
    content: string
    originalScore: number
    adjustedScore: number
    metadata?: any
}

export const scoreWithVectorStore = async (
    memories: Array<{ id: string; content: string; score: number; metadata?: any }>, 
    env: Env,
    context?: {
        sessionId?: string
        recentSearches?: string[]
    }
): Promise<ScoredMemory[]> => {
    if (!memories.length) return []
    
    const scoredMemories: ScoredMemory[] = []
    
    for (const memory of memories) {
        let adjustedScore = memory.score
        
        // Query vector store for scoring factors
        try {
            // Search for user preference signals
            const prefQuery = `user preference ${memory.content.substring(0, 100)}`
            const prefResults = await env.VECTORIZE.query(prefQuery, {
                topK: 3,
                namespace: SCORING_NAMESPACE,
                filter: { type: "user-preference" }
            })
            
            // Boost score if this matches user preferences
            if (prefResults.matches?.length > 0) {
                const prefBoost = prefResults.matches[0].score * 0.3
                adjustedScore = Math.min(adjustedScore + prefBoost, 1.0)
            }
            
            // Search for recency factors
            if (memory.metadata?.createdAt) {
                const ageMs = Date.now() - new Date(memory.metadata.createdAt).getTime()
                const daysSinceCreated = ageMs / (1000 * 60 * 60 * 24)
                
                // Store recency factor for future learning
                await storeScoreFactor(memory.id, "recency", daysSinceCreated, env)
                
                // Apply recency boost
                if (daysSinceCreated < 7) {
                    adjustedScore = Math.min(adjustedScore * 1.2, 1.0)
                }
            }
            
            // Context-based scoring from session
            if (context?.recentSearches) {
                const contextQuery = context.recentSearches.join(" ")
                const contextResults = await env.VECTORIZE.query(contextQuery, {
                    topK: 1,
                    namespace: memory.metadata?.namespace || "all",
                    filter: { id: memory.id }
                })
                
                if (contextResults.matches?.length > 0) {
                    adjustedScore = Math.min(adjustedScore * 1.1, 1.0)
                }
            }
            
        } catch (error) {
            console.error("Error scoring with vector store:", error)
        }
        
        scoredMemories.push({
            id: memory.id,
            content: memory.content,
            originalScore: memory.score,
            adjustedScore,
            metadata: memory.metadata
        })
    }
    
    // Sort by adjusted score
    return scoredMemories.sort((a, b) => b.adjustedScore - a.adjustedScore)
}

async function storeScoreFactor(
    memoryId: string,
    factorType: string,
    value: number,
    env: Env
): Promise<void> {
    try {
        const factorData = {
            memoryId,
            factorType,
            value,
            timestamp: new Date().toISOString()
        }
        
        const id = `factor-${memoryId}-${factorType}-${Date.now()}`
        
        // Store in D1
        await env.DB.prepare(
            "INSERT INTO memories (id, content, namespace, created_at) VALUES (?, ?, ?, ?)"
        ).bind(
            id,
            JSON.stringify(factorData),
            SCORING_NAMESPACE,
            new Date().toISOString()
        ).run()
        
        // Store in Vectorize for similarity-based factor discovery
        await env.VECTORIZE.insert([{
            id: id,
            values: [], // Will be populated by AI
            namespace: SCORING_NAMESPACE,
            metadata: {
                type: factorType,
                memoryId: memoryId,
                value: value
            }
        }])
    } catch (error) {
        console.error("Error storing score factor:", error)
    }
}