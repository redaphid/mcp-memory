import { storeMemoryInD1, storeMemoryInVectorize } from "./db"
import { categorizeMemory } from "./auto-categorize"
import { storeQueryExpansion } from "./query-expansion"

export const enhancedStoreMemory = async (
    content: string,
    namespace: string,
    env: Env,
    metadata?: any
): Promise<{ id: string; categorization: any }> => {
    // 1. Auto-categorize the memory
    const categorization = await categorizeMemory(content, env)
    
    // 2. Merge categorization with provided metadata
    const enhancedMetadata = {
        ...metadata,
        tags: [...new Set([...(metadata?.tags || []), ...categorization.tags])],
        category: metadata?.category || categorization.category,
        language: metadata?.language || categorization.language,
        autoCategorized: true,
        categorizedAt: new Date().toISOString()
    }
    
    // 3. Store in D1 with enhanced metadata
    const id = `memory-${Date.now()}-${Math.random().toString(36).substring(7)}`
    await storeMemoryInD1(id, content, namespace, env)
    
    // 4. Store in Vectorize with enhanced metadata
    await storeMemoryInVectorize(id, content, namespace, env, enhancedMetadata)
    
    // 5. Extract and store query expansions from content
    await extractAndStoreExpansions(content, categorization, env)
    
    return { id, categorization }
}

async function extractAndStoreExpansions(
    content: string,
    categorization: any,
    env: Env
): Promise<void> {
    try {
        // Extract key terms that could be expanded
        const keyTerms = new Set<string>()
        
        // Add category as a key term
        if (categorization.category) {
            keyTerms.add(categorization.category)
        }
        
        // Extract terms from tags
        categorization.tags.forEach((tag: string) => {
            if (tag.startsWith('#')) {
                keyTerms.add(tag.substring(1))
            }
        })
        
        // Find related terms in content
        const commonTerms = [
            ["add", "tdd", "test driven development"],
            ["api", "endpoint", "rest"],
            ["error", "exception", "bug"],
            ["async", "promise", "await"]
        ]
        
        for (const termGroup of commonTerms) {
            const foundTerms = termGroup.filter(term => 
                content.toLowerCase().includes(term)
            )
            
            if (foundTerms.length > 1) {
                // Store these as related queries
                for (const term of foundTerms) {
                    const relatedQueries = termGroup.filter(t => t !== term)
                    await storeQueryExpansion(term, relatedQueries, env)
                }
            }
        }
        
    } catch (error) {
        console.error("Error extracting expansions:", error)
    }
}