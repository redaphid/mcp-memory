interface SessionData {
    sessionId: string
    startTime: number
    searches: Array<{
        query: string
        timestamp: number
        resultsCount: number
    }>
    viewedMemories: string[]
    suggestedTopics: string[]
    lastActivityTime: number
}

const SESSION_NAMESPACE = "system:sessions"

export class SessionContext {
    private sessionData: SessionData
    private env: Env
    
    constructor(sessionId: string, env: Env) {
        this.env = env
        this.sessionData = {
            sessionId,
            startTime: Date.now(),
            searches: [],
            viewedMemories: [],
            suggestedTopics: [],
            lastActivityTime: Date.now()
        }
    }
    
    async recordSearch(query: string, resultsCount: number) {
        this.sessionData.searches.push({
            query,
            timestamp: Date.now(),
            resultsCount
        })
        this.sessionData.lastActivityTime = Date.now()
        await this.save()
    }
    
    async recordMemoryView(memoryId: string) {
        if (!this.sessionData.viewedMemories.includes(memoryId)) {
            this.sessionData.viewedMemories.push(memoryId)
        }
        this.sessionData.lastActivityTime = Date.now()
        await this.save()
    }
    
    getUnexploredTopics(): string[] {
        const searchedTerms = new Set(
            this.sessionData.searches.map(s => s.query.toLowerCase())
        )
        
        // Suggest related topics that haven't been searched
        const suggestions: string[] = []
        
        // If searched for ADD but not TDD
        if (searchedTerms.has("add") && !searchedTerms.has("tdd")) {
            suggestions.push("TDD practices")
        }
        
        // If searched for error handling but not logging
        if (searchedTerms.has("error") && !searchedTerms.has("logging")) {
            suggestions.push("logging patterns")
        }
        
        // If searched for API but not authentication
        if (searchedTerms.has("api") && !searchedTerms.has("auth")) {
            suggestions.push("authentication patterns")
        }
        
        return suggestions
    }
    
    async getRelatedUnsearchedMemories(env: Env): Promise<string[]> {
        // Find memories related to what was searched but not yet viewed
        const relatedMemories: string[] = []
        
        for (const search of this.sessionData.searches) {
            try {
                const results = await env.DB.prepare(
                    `SELECT id, content FROM memories 
                     WHERE namespace LIKE '%philosophy%' 
                     AND content LIKE ? 
                     AND id NOT IN (${this.sessionData.viewedMemories.map(() => '?').join(',')})
                     AND deleted_at IS NULL
                     LIMIT 5`
                ).bind(`%${search.query}%`, ...this.sessionData.viewedMemories).all()
                
                if (results.results) {
                    results.results.forEach((memory: any) => {
                        relatedMemories.push(memory.content.substring(0, 100) + "...")
                    })
                }
            } catch (error) {
                console.error("Error finding related memories:", error)
            }
        }
        
        return relatedMemories
    }
    
    getSessionSummary() {
        return {
            duration: Date.now() - this.sessionData.startTime,
            searchCount: this.sessionData.searches.length,
            memoriesViewed: this.sessionData.viewedMemories.length,
            topSearches: this.sessionData.searches.map(s => s.query),
            unexploredTopics: this.getUnexploredTopics()
        }
    }
    
    private async save() {
        try {
            await this.env.DB.prepare(
                `INSERT OR REPLACE INTO memories (id, content, namespace, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?)`
            ).bind(
                this.sessionData.sessionId,
                JSON.stringify(this.sessionData),
                SESSION_NAMESPACE,
                new Date(this.sessionData.startTime).toISOString(),
                new Date().toISOString()
            ).run()
        } catch (error) {
            console.error("Error saving session data:", error)
        }
    }
    
    static async load(sessionId: string, env: Env): Promise<SessionContext | null> {
        try {
            const result = await env.DB.prepare(
                "SELECT content FROM memories WHERE id = ? AND namespace = ? AND deleted_at IS NULL"
            ).bind(sessionId, SESSION_NAMESPACE).first()
            
            if (result?.content) {
                const session = new SessionContext(sessionId, env)
                session.sessionData = JSON.parse(result.content as string)
                return session
            }
        } catch (error) {
            console.error("Error loading session:", error)
        }
        
        return null
    }
}