import { MCPRequest, MCPResponse } from "../types/mcp"

export async function handleResourcesRead(request: MCPRequest, env: Env): Promise<MCPResponse> {
    const uri = request.params?.uri
    
    if (uri === "memory://philosophy/guide") {
        return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
                contents: [
                    {
                        uri: "memory://philosophy/guide",
                        mimeType: "text/markdown",
                        text: `# MCP Memory System Guide

## How It Works

The MCP Memory system stores and retrieves coding patterns, preferences, and knowledge using vector search and intelligent categorization.

### Key Features:
1. **Auto-categorization**: Memories are automatically tagged and categorized
2. **Query expansion**: Searches are expanded to find related content
3. **Relevance scoring**: Results are scored based on recency, preferences, and context
4. **Session tracking**: The system learns from your search patterns

### Slash Commands:

- \`/remember <pattern>\` - Store a new pattern or preference
- \`/search <topic>\` - Search for relevant memories
- \`/philosophy\` - Get coding philosophy for current context

### Best Practices:

1. **Search before starting**: Always search for relevant patterns before implementing
2. **Store discoveries**: When you find a pattern that works, remember it
3. **Be specific**: Include context when storing memories
4. **Use tags**: Tag memories with #language, #pattern, #preference, etc.

### Namespaces:
- \`user:*\` - Personal preferences and patterns
- \`project:*\` - Project-specific patterns
- \`system:*\` - System-managed data (expansions, scoring)

### Examples:

\`\`\`
/remember "Always use arrow functions in TypeScript" #typescript #style
/search "error handling patterns"
/philosophy testing
\`\`\`
`
                    }
                ]
            }
        }
    }
    
    if (uri === "memory://philosophy/recent") {
        const recentMemories = await env.DB.prepare(
            "SELECT content, created_at FROM memories WHERE namespace LIKE '%philosophy%' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10"
        ).all()
        
        const recentText = recentMemories.results?.map((m: any) => 
            `- ${m.content.substring(0, 100)}... (${new Date(m.created_at).toLocaleDateString()})`
        ).join('\n') || "No recent memories found"
        
        return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
                contents: [
                    {
                        uri: "memory://philosophy/recent",
                        mimeType: "text/markdown",
                        text: `# Recent Coding Philosophy Memories\n\n${recentText}`
                    }
                ]
            }
        }
    }
    
    return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
            code: -32602,
            message: "Resource not found"
        }
    }
}

export function getResourcesList() {
    return [
        {
            uri: "memory://philosophy/guide",
            name: "Coding Philosophy Guide",
            description: "How to use the MCP Memory system effectively",
            mimeType: "text/markdown"
        },
        {
            uri: "memory://philosophy/recent",
            name: "Recent Memories",
            description: "Recently added coding patterns and preferences",
            mimeType: "text/markdown"
        }
    ]
}