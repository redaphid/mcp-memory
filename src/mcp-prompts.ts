interface PromptContext {
    message?: string
    isNewSession?: boolean
    lastSearchTime?: number
    currentFile?: string
    error?: any
}

const PROMPT_TRIGGERS = {
    sessionStart: "Starting new session. Search coding philosophy for project patterns and preferences",
    testing: "Test file detected. Search coding philosophy for: ADD process, TDD rules, test structure",
    implementation: "Implementation task detected. Search coding philosophy for: patterns, error handling, style guide",
    error: "Error encountered. Search coding philosophy for: similar errors, debugging patterns",
    periodic: "Remember to check coding philosophy for current work context",
    database: "Database operation detected. Search for: D1 patterns, soft deletes, migration strategies",
    api: "API endpoint detected. Search for: REST patterns, error responses, naming conventions"
}

export const getContextualPrompt = (context: PromptContext): string | null => {
    if (context.isNewSession) {
        return PROMPT_TRIGGERS.sessionStart
    }
    
    if (context.currentFile?.includes('.test.') || context.currentFile?.includes('.spec.')) {
        return PROMPT_TRIGGERS.testing
    }
    
    if (context.error) {
        return PROMPT_TRIGGERS.error
    }
    
    if (context.message) {
        const keywords = context.message.toLowerCase()
        
        if (keywords.includes('implement') || keywords.includes('create') || keywords.includes('build')) {
            return PROMPT_TRIGGERS.implementation
        }
        
        if (keywords.includes('database') || keywords.includes('d1') || keywords.includes('sql')) {
            return PROMPT_TRIGGERS.database
        }
        
        if (keywords.includes('api') || keywords.includes('endpoint') || keywords.includes('route')) {
            return PROMPT_TRIGGERS.api
        }
    }
    
    // Periodic reminder every 10 minutes
    if (context.lastSearchTime && Date.now() - context.lastSearchTime > 600000) {
        return PROMPT_TRIGGERS.periodic
    }
    
    return null
}