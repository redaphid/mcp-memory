import { MCPRequest, MCPResponse, MCPNotification } from "./types/mcp"
import { MCPServer } from "./server/mcp-server"
import { handlePromptsGet, getPromptsList } from "./server/prompts"
import { handleResourcesRead, getResourcesList } from "./server/resources"

export class MCPSSEServer {
    private namespace: string
    private env: Env
    private mcpServer: MCPServer

    constructor(namespace: string, env: Env) {
        this.namespace = namespace
        this.env = env
        this.mcpServer = new MCPServer(namespace, env)
    }

    async handleSSEConnection(): Promise<Response> {
        const stream = new ReadableStream({
            start: (controller) => {
                const helloMessage: MCPNotification = {
                    jsonrpc: "2.0",
                    method: "mcp/hello",
                    params: {
                        protocolVersion: "2024-11-05",
                        capabilities: {
                            tools: {
                                listChanged: true
                            },
                            prompts: {
                                listChanged: true
                            },
                            resources: {
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

                // Keep the connection alive with periodic heartbeats
                const keepAlive = setInterval(() => {
                    try {
                        const heartbeat = `: heartbeat\n\n`
                        controller.enqueue(new TextEncoder().encode(heartbeat))
                    } catch (error) {
                        clearInterval(keepAlive)
                    }
                }, 30000)

                // Store the interval so it can be cleared when connection closes
                setTimeout(() => clearInterval(keepAlive), 300000) // Clear after 5 minutes
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
                                },
                                prompts: {
                                    listChanged: true
                                },
                                resources: {
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
                            tools: this.mcpServer.getToolsList()
                        }
                    }

                case "prompts/list":
                    return {
                        jsonrpc: "2.0",
                        id: request.id,
                        result: {
                            prompts: getPromptsList()
                        }
                    }

                case "prompts/get":
                    return await handlePromptsGet(request)

                case "resources/list":
                    return {
                        jsonrpc: "2.0",
                        id: request.id,
                        result: {
                            resources: getResourcesList()
                        }
                    }

                case "resources/read":
                    return await handleResourcesRead(request, this.env)

                case "tools/call":
                    return await this.mcpServer.handleToolCall(request)

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
}