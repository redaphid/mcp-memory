export const categorizeMemory = async (content: string, env: Env): Promise<{
    tags: string[]
    category: string
    language?: string
}> => {
    const result = {
        tags: [] as string[],
        category: "general",
        language: undefined as string | undefined
    }
    
    const lowerContent = content.toLowerCase()
    
    // Detect category
    if (lowerContent.includes("error") || lowerContent.includes("fix") || lowerContent.includes("bug")) {
        result.category = "error-fix"
        result.tags.push("#error-fix")
    } else if (lowerContent.includes("pattern") || lowerContent.includes("approach")) {
        result.category = "patterns"
        result.tags.push("#pattern")
    } else if (lowerContent.includes("preference") || lowerContent.includes("style") || lowerContent.includes("convention")) {
        result.category = "preferences"
        result.tags.push("#user-preference")
    } else if (lowerContent.includes("test") || lowerContent.includes("tdd") || lowerContent.includes("add")) {
        result.category = "testing"
        result.tags.push("#testing")
    }
    
    // Detect programming language from code blocks or keywords
    if (content.includes("```typescript") || content.includes("```ts") || lowerContent.includes("typescript")) {
        result.language = "typescript"
        result.tags.push("#typescript")
    } else if (content.includes("```javascript") || content.includes("```js")) {
        result.language = "javascript"
        result.tags.push("#javascript")
    } else if (content.includes("```sql") || lowerContent.includes("select ") || lowerContent.includes("insert ")) {
        result.language = "sql"
        result.tags.push("#sql")
    }
    
    // Detect domain
    if (lowerContent.includes("database") || lowerContent.includes("d1") || lowerContent.includes("sqlite")) {
        result.tags.push("#database")
    }
    if (lowerContent.includes("api") || lowerContent.includes("endpoint") || lowerContent.includes("rest")) {
        result.tags.push("#api")
    }
    if (lowerContent.includes("cloudflare") || lowerContent.includes("worker")) {
        result.tags.push("#cloudflare")
    }
    if (lowerContent.includes("async") || lowerContent.includes("promise") || lowerContent.includes("await")) {
        result.tags.push("#async")
    }
    
    // Use AI for more intelligent categorization if available
    try {
        const aiResponse = await env.AI.run("@cf/meta/llama-2-7b-chat-int8", {
            prompt: `Analyze this text and provide tags and category.
Text: ${content.substring(0, 500)}

Provide a JSON response with:
- tags: array of relevant hashtags (e.g., ["#typescript", "#testing"])
- category: one of [patterns, gotchas, tools, principles, architecture, preferences, error-fix]

Response:`,
            max_tokens: 100
        })
        
        try {
            const aiResult = JSON.parse(aiResponse.response)
            if (aiResult.tags && Array.isArray(aiResult.tags)) {
                result.tags.push(...aiResult.tags.filter((tag: string) => tag.startsWith('#')))
            }
            if (aiResult.category) {
                result.category = aiResult.category
            }
        } catch {
            // If AI response isn't valid JSON, continue with rule-based categorization
        }
    } catch (error) {
        console.error("AI categorization failed:", error)
    }
    
    // Remove duplicates
    result.tags = [...new Set(result.tags)]
    
    return result
}