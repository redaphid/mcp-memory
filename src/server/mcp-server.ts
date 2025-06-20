import { 
    addToMCPMemoryTool, addToMCPMemoryHandler,
    searchMCPMemoryTool, searchMCPMemoryHandler,
    searchAllMemoriesTool, searchAllMemoriesHandler,
    deleteMemoryTool, deleteMemoryHandler,
    deleteNamespaceTool, deleteNamespaceHandler
} from "../handlers/memory-tools"
import {
    rememberHowToTool, rememberHowToHandler,
    findHowToTool, findHowToHandler,
    listCapabilitiesTool, listCapabilitiesHandler
} from "../handlers/howto-tools"
import { MCPRequest, MCPResponse } from "../types/mcp"

export class MCPServer {
    private namespace: string
    private env: Env

    constructor(namespace: string, env: Env) {
        this.namespace = namespace
        this.env = env
    }

    async handleToolCall(request: MCPRequest): Promise<MCPResponse> {
        const { name, arguments: args } = request.params
        const context = { namespace: this.namespace, env: this.env }


        try {
            switch (name) {
                case "addToMCPMemory":
                    const result1 = await addToMCPMemoryHandler(args, context)
                    return { jsonrpc: "2.0", id: request.id, result: result1 }

                case "searchMCPMemory":
                    const result2 = await searchMCPMemoryHandler(args, context)
                    return { jsonrpc: "2.0", id: request.id, result: result2 }

                case "searchAllMemories":
                    const result3 = await searchAllMemoriesHandler(args, context)
                    return { jsonrpc: "2.0", id: request.id, result: result3 }

                case "deleteMemory":
                    const result4 = await deleteMemoryHandler(args, context)
                    return { jsonrpc: "2.0", id: request.id, result: result4 }

                case "deleteNamespace":
                    const result5 = await deleteNamespaceHandler(args, context)
                    return { jsonrpc: "2.0", id: request.id, result: result5 }

                case "rememberHowTo":
                    const result6 = await rememberHowToHandler(args, context)
                    return { jsonrpc: "2.0", id: request.id, result: result6 }

                case "findHowTo":
                    const result7 = await findHowToHandler(args, context)
                    return { jsonrpc: "2.0", id: request.id, result: result7 }

                case "listCapabilities":
                    const result8 = await listCapabilitiesHandler(args, context)
                    return { jsonrpc: "2.0", id: request.id, result: result8 }

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

    getToolsList() {
        return [
            addToMCPMemoryTool,
            searchMCPMemoryTool,
            searchAllMemoriesTool,
            deleteMemoryTool,
            deleteNamespaceTool,
            rememberHowToTool,
            findHowToTool,
            listCapabilitiesTool
        ]
    }
}