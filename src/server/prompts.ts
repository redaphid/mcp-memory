import { MCPRequest, MCPResponse } from "../types/mcp"

export async function handlePromptsGet(request: MCPRequest): Promise<MCPResponse> {
    const promptName = request.params?.name
    const promptArgs = request.params?.arguments || {}
    
    if (promptName === "search_philosophy") {
        return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Search the coding philosophy for: ${promptArgs.topic}`
                        }
                    }
                ]
            }
        }
    }
    
    if (promptName === "remember_pattern") {
        return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Remember this pattern: ${promptArgs.pattern}${promptArgs.context ? `\nContext: ${promptArgs.context}` : ""}`
                        }
                    }
                ]
            }
        }
    }
    
    if (promptName === "session_start") {
        return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: "🚀 MANDATORY SESSION START PROTOCOL:\n\nBefore ANY work, you MUST extensively and recursively search the coding philosophy MCP. This is NOT optional.\n\n🔍 REQUIRED SEARCHES (minimum 5-8 queries):\n1. Programming language/framework (typescript, cloudflare, workers, etc.)\n2. Task type (testing, api, database, deployment, etc.)\n3. Code style guidelines (hemingway, sparse, early returns, etc.)\n4. Tools and libraries preferences\n5. Error handling patterns\n6. Project-specific gotchas and conventions\n7. Communication preferences\n8. Any technology stack mentioned by user\n\n⚡ RECURSIVE SEARCH: Use results from initial searches to inform additional searches. If you find \"TypeScript style guide\", search for \"typescript coding preferences\", \"no semicolons\", \"arrow functions\", etc.\n\n🎯 FREQUENCY: Search coding philosophy MCP:\n- At session start (MANDATORY)\n- Before implementing any new feature\n- When encountering errors\n- Every 10-15 messages\n- When user mentions new tools/technologies\n- Before making architectural decisions\n\nSTART SEARCHING NOW. Do not proceed until you have comprehensive understanding of the coding philosophy."
                        }
                    }
                ]
            }
        }
    }
    
    if (promptName === "check_philosophy") {
        return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: "⚡ PHILOSOPHY CHECK REQUIRED:\n\nSearch the coding philosophy MCP for guidance on your current task. This should happen:\n\n🔄 WHEN TO SEARCH:\n- Before implementing any feature\n- When encountering errors or issues\n- After every 10-15 messages\n- When user mentions new tools/patterns\n- Before making code changes\n\n🎯 SEARCH FOR:\n- Patterns related to your current task\n- Code style guidelines\n- Error handling approaches\n- Testing patterns\n- Technology-specific best practices\n\nSearch NOW before proceeding. Always check the philosophy first."
                        }
                    }
                ]
            }
        }
    }
    
    if (promptName === "periodic_update_philosophy") {
        return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: "🔄 PERIODIC UPDATE REQUIRED:\n\nSearch and refresh your coding philosophy knowledge. Perform comprehensive searches to update your understanding of current patterns and practices."
                        }
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
            message: "Unknown prompt"
        }
    }
}

export function getPromptsList() {
    return [
        {
            name: "session_start",
            description: "🚀 MANDATORY: Start new session - MUST search coding philosophy extensively",
            arguments: [
                {
                    name: "project_type",
                    description: "Type of project (e.g., 'typescript', 'cloudflare', 'api')",
                    required: false
                }
            ]
        },
        {
            name: "check_philosophy",
            description: "⚡ Check coding philosophy before implementing features",
            arguments: []
        },
        {
            name: "search_philosophy",
            description: "Search coding philosophy for specific topics",
            arguments: [
                {
                    name: "topic",
                    description: "The topic to search for (e.g., 'testing', 'error handling', 'typescript')",
                    required: true
                }
            ]
        },
        {
            name: "remember_pattern",
            description: "Remember a discovered pattern or preference",
            arguments: [
                {
                    name: "pattern",
                    description: "The pattern or preference to remember",
                    required: true
                },
                {
                    name: "context",
                    description: "When this pattern applies",
                    required: false
                }
            ]
        },
        {
            name: "periodic_update_philosophy",
            description: "🔄 Periodic update - Refresh and sync coding philosophy memories",
            arguments: []
        }
    ]
}