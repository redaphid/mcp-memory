import { searchMemories, storeMemory, deleteVectorById } from "./utils/vectorize"
import { storeMemoryInD1, deleteMemoryFromD1 } from "./utils/db"

export interface MCPRequest {
    jsonrpc: "2.0"
    id?: string | number
    method: string
    params?: any
}

export interface MCPResponse {
    jsonrpc: "2.0"
    id?: string | number
    result?: any
    error?: {
        code: number
        message: string
        data?: any
    }
}

export interface MCPNotification {
    jsonrpc: "2.0"
    method: string
    params?: any
}

export class MCPSSEServer {
    private namespace: string
    private env: Env

    constructor(namespace: string, env: Env) {
        this.namespace = namespace
        this.env = env
    }

    async handleSSEConnection(): Promise<Response> {
        // Create SSE response
        const stream = new ReadableStream({
            start: (controller) => {
                // Send initial hello message
                const helloMessage: MCPNotification = {
                    jsonrpc: "2.0",
                    method: "mcp/hello",
                    params: {
                        protocolVersion: "2024-11-05",
                        capabilities: {
                            tools: {
                                listChanged: true
                            }
                        },
                        serverInfo: {
                            name: "MCP Memory",
                            version: "1.0.0"
                        }
                    }
                }

                const helloData = `data: ${JSON.stringify(helloMessage)}\n\n`
                controller.enqueue(new TextEncoder().encode(helloData))

                // Send tools list
                const toolsMessage: MCPNotification = {
                    jsonrpc: "2.0",
                    method: "tools/list",
                    params: {
                        tools: [
                            {
                                name: "addToMCPMemory",
                                description: "Store important information in persistent memory",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        thingToRemember: {
                                            type: "string",
                                            description: "The information to remember"
                                        },
                                        namespace: {
                                            type: "string",
                                            description:
                                                "Optional namespace to store the memory in (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
                                        }
                                    },
                                    required: ["thingToRemember"]
                                }
                            },
                            {
                                name: "searchMCPMemory",
                                description: "Search for relevant information in memory",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        informationToGet: {
                                            type: "string",
                                            description: "The information to search for"
                                        },
                                        namespace: {
                                            type: "string",
                                            description:
                                                "Optional namespace to search in (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
                                        }
                                    },
                                    required: ["informationToGet"]
                                }
                            },
                            {
                                name: "searchAllMemories",
                                description: "Search across all namespaces for relevant memories",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        query: {
                                            type: "string",
                                            description: "The search query"
                                        }
                                    },
                                    required: ["query"]
                                }
                            },
                            {
                                name: "deleteMemory",
                                description: "Delete a specific memory by its ID from the current namespace",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        memoryId: {
                                            type: "string",
                                            description: "The ID of the memory to delete"
                                        },
                                        namespace: {
                                            type: "string",
                                            description: "Optional namespace to delete from (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
                                        }
                                    },
                                    required: ["memoryId"]
                                }
                            },
                            {
                                name: "deleteNamespace",
                                description: "Delete an entire namespace and all its memories. Use with caution as this action cannot be undone.",
                                inputSchema: {
                                    type: "object",
                                    properties: {
                                        namespace: {
                                            type: "string",
                                            description: "The namespace to delete (e.g., 'user:alice', 'project:frontend')"
                                        }
                                    },
                                    required: ["namespace"]
                                }
                            }
                        ]
                    }
                }

                const toolsData = `data: ${JSON.stringify(toolsMessage)}\n\n`
                controller.enqueue(new TextEncoder().encode(toolsData))
            }
        })

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        })
    }

    async handleJSONRPCRequest(request: MCPRequest): Promise<MCPResponse> {
        console.log("Handling JSONRPC request:", request.method)

        try {
            switch (request.method) {
                case "initialize":
                    return {
                        jsonrpc: "2.0",
                        id: request.id,
                        result: {
                            protocolVersion: "2024-11-05",
                            capabilities: {
                                tools: {
                                    listChanged: true
                                }
                            },
                            serverInfo: {
                                name: "MCP Memory",
                                version: "1.0.0"
                            }
                        }
                    }

                case "tools/list":
                    return {
                        jsonrpc: "2.0",
                        id: request.id,
                        result: {
                            tools: [
                                {
                                    name: "addToMCPMemory",
                                    description: "Store important information in persistent memory",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            thingToRemember: {
                                                type: "string",
                                                description: "The information to remember"
                                            },
                                            namespace: {
                                                type: "string",
                                                description:
                                                    "Optional namespace to store the memory in (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
                                            }
                                        },
                                        required: ["thingToRemember"]
                                    }
                                },
                                {
                                    name: "searchMCPMemory",
                                    description: "Search for relevant information in memory",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            informationToGet: {
                                                type: "string",
                                                description: "The information to search for"
                                            },
                                            namespace: {
                                                type: "string",
                                                description:
                                                    "Optional namespace to search in (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
                                            }
                                        },
                                        required: ["informationToGet"]
                                    }
                                },
                                {
                                    name: "searchAllMemories",
                                    description: "Search across all namespaces for relevant memories",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            query: {
                                                type: "string",
                                                description: "The search query"
                                            }
                                        },
                                        required: ["query"]
                                    }
                                },
                                {
                                    name: "deleteMemory",
                                    description: "Delete a specific memory by its ID from the current namespace",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            memoryId: {
                                                type: "string",
                                                description: "The ID of the memory to delete"
                                            },
                                            namespace: {
                                                type: "string",
                                                description: "Optional namespace to delete from (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
                                            }
                                        },
                                        required: ["memoryId"]
                                    }
                                },
                                {
                                    name: "deleteNamespace",
                                    description: "Delete an entire namespace and all its memories. Use with caution as this action cannot be undone.",
                                    inputSchema: {
                                        type: "object",
                                        properties: {
                                            namespace: {
                                                type: "string",
                                                description: "The namespace to delete (e.g., 'user:alice', 'project:frontend')"
                                            }
                                        },
                                        required: ["namespace"]
                                    }
                                }
                            ]
                        }
                    }

                case "tools/call":
                    return await this.handleToolCall(request)

                default:
                    return {
                        jsonrpc: "2.0",
                        id: request.id,
                        error: {
                            code: -32601,
                            message: "Method not found"
                        }
                    }
            }
        } catch (error) {
            console.error("Error handling JSONRPC request:", error)
            return {
                jsonrpc: "2.0",
                id: request.id,
                error: {
                    code: -32603,
                    message: "Internal error",
                    data: error instanceof Error ? error.message : String(error)
                }
            }
        }
    }

    private async handleToolCall(request: MCPRequest): Promise<MCPResponse> {
        const { name, arguments: args } = request.params

        console.log(`Calling tool: ${name} with args:`, args)

        try {
            switch (name) {
                case "addToMCPMemory":
                    const { thingToRemember, namespace: customNamespace } = args
                    const targetNamespace = customNamespace || this.namespace
                    const memoryId = await storeMemory(thingToRemember, targetNamespace, this.env)
                    await storeMemoryInD1(thingToRemember, targetNamespace, this.env, memoryId)

                    console.log(`Memory stored successfully in namespace '${targetNamespace}' with ID: ${memoryId}`)

                    return {
                        jsonrpc: "2.0",
                        id: request.id,
                        result: {
                            content: [
                                {
                                    type: "text",
                                    text: `Remembered in ${targetNamespace}: ${thingToRemember}`
                                }
                            ]
                        }
                    }

                case "searchMCPMemory":
                    const { informationToGet, namespace: searchNamespace } = args
                    const searchTargetNamespace = searchNamespace || this.namespace
                    const memories = await searchMemories(informationToGet, searchTargetNamespace, this.env)

                    console.log(`Search returned ${memories.length} matches`)

                    if (memories.length > 0) {
                        return {
                            jsonrpc: "2.0",
                            id: request.id,
                            result: {
                                content: [
                                    {
                                        type: "text",
                                        text:
                                            `Found memories in ${searchTargetNamespace}:\n` +
                                            memories
                                                .map((m) => `${m.content} (score: ${m.score.toFixed(4)})`)
                                                .join("\n")
                                    }
                                ]
                            }
                        }
                    } else {
                        return {
                            jsonrpc: "2.0",
                            id: request.id,
                            result: {
                                content: [
                                    {
                                        type: "text",
                                        text: `No relevant memories found in ${searchTargetNamespace}.`
                                    }
                                ]
                            }
                        }
                    }

                case "deleteMemory":
                    const { memoryId, namespace: deleteNamespace } = args
                    const deleteTargetNamespace = deleteNamespace || this.namespace
                    
                    try {
                        // Delete from both D1 and Vectorize
                        await deleteMemoryFromD1(memoryId, deleteTargetNamespace, this.env)
                        await deleteVectorById(memoryId, deleteTargetNamespace, this.env)
                        
                        console.log(`Memory ${memoryId} deleted from namespace '${deleteTargetNamespace}'`)
                        
                        return {
                            jsonrpc: "2.0",
                            id: request.id,
                            result: {
                                content: [
                                    {
                                        type: "text",
                                        text: `Memory ${memoryId} deleted from ${deleteTargetNamespace}`
                                    }
                                ]
                            }
                        }
                    } catch (error) {
                        console.error("Error in deleteMemory:", error)
                        throw new Error(`Failed to delete memory: ${error}`)
                    }

                case "deleteNamespace":
                    const { namespace: namespaceToDelete } = args
                    
                    try {
                        // Get all memories in the namespace first (excluding already deleted)
                        const memories = await this.env.DB.prepare(
                            "SELECT id FROM memories WHERE namespace = ? AND deleted_at IS NULL"
                        ).bind(namespaceToDelete).all()
                        
                        // Delete all vectors for this namespace
                        if (memories.results && memories.results.length > 0) {
                            for (const row of memories.results) {
                                const memoryId = (row as any).id
                                try {
                                    await deleteVectorById(memoryId, namespaceToDelete, this.env)
                                } catch (error) {
                                    console.error(`Error deleting vector ${memoryId}:`, error)
                                }
                            }
                        }
                        
                        // Soft delete all memories from D1
                        const deletedAt = new Date().toISOString()
                        const deleteResult = await this.env.DB.prepare(
                            "UPDATE memories SET deleted_at = ? WHERE namespace = ? AND deleted_at IS NULL"
                        ).bind(deletedAt, namespaceToDelete).run()
                        
                        const deletedCount = deleteResult.meta?.changes || 0
                        console.log(`Deleted ${deletedCount} memories from namespace '${namespaceToDelete}'`)
                        
                        return {
                            jsonrpc: "2.0",
                            id: request.id,
                            result: {
                                content: [
                                    {
                                        type: "text",
                                        text: `Namespace ${namespaceToDelete} deleted with ${deletedCount} memories`
                                    }
                                ]
                            }
                        }
                    } catch (error) {
                        console.error("Error in deleteNamespace:", error)
                        throw new Error(`Failed to delete namespace: ${error}`)
                    }

                case "searchAllMemories":
                    const { query } = args

                    // Get all namespaces (excluding deleted memories)
                    const result = await this.env.DB.prepare("SELECT DISTINCT namespace FROM memories WHERE deleted_at IS NULL").all()
                    const allResults = []

                    if (result.results) {
                        for (const row of result.results) {
                            const namespace = (row as any).namespace
                            try {
                                const memories = await searchMemories(query, namespace, this.env)
                                if (memories.length > 0) {
                                    allResults.push({
                                        namespace,
                                        memories: memories.map((m) => ({
                                            content: m.content,
                                            score: m.score
                                        }))
                                    })
                                }
                            } catch (error) {
                                console.error(`Error searching namespace ${namespace}:`, error)
                            }
                        }
                    }

                    if (allResults.length > 0) {
                        return {
                            jsonrpc: "2.0",
                            id: request.id,
                            result: {
                                content: [
                                    {
                                        type: "text",
                                        text:
                                            "Found memories across all namespaces:\n" +
                                            allResults
                                                .map(
                                                    (result) =>
                                                        `\nIn ${result.namespace}:\n` +
                                                        result.memories
                                                            .map((m) => `${m.content} (score: ${m.score.toFixed(4)})`)
                                                            .join("\n")
                                                )
                                                .join("\n")
                                    }
                                ]
                            }
                        }
                    } else {
                        return {
                            jsonrpc: "2.0",
                            id: request.id,
                            result: {
                                content: [
                                    {
                                        type: "text",
                                        text: "No relevant memories found across any namespace."
                                    }
                                ]
                            }
                        }
                    }

                default:
                    return {
                        jsonrpc: "2.0",
                        id: request.id,
                        error: {
                            code: -32601,
                            message: `Unknown tool: ${name}`
                        }
                    }
            }
        } catch (error) {
            console.error(`Error executing tool ${name}:`, error)
            return {
                jsonrpc: "2.0",
                id: request.id,
                error: {
                    code: -32603,
                    message: "Tool execution failed",
                    data: error instanceof Error ? error.message : String(error)
                }
            }
        }
    }
}
