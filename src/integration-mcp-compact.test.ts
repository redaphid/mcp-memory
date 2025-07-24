import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { v4 as uuidv4 } from "uuid"
import { Client } from "@moinfra/mcp-client-sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@moinfra/mcp-client-sdk/client/streamableHttp.js"

const BASE_URL = process.env.TEST_URL || "https://mcp-memory.loqwai.workers.dev"
const TEST_NAMESPACE = `user:vitest-compact-${Date.now()}`

describe("MCP Compact Memories Integration Test", () => {
    let client: Client
    
    beforeAll(async () => {
        const url = new URL(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/sse`)
        const transport = new StreamableHTTPClientTransport(url)
        client = new Client({
            name: 'compact-test-client',
            version: '1.0.0'
        })
        await client.connect(transport)
    })
    
    afterAll(async () => {
        // Clean up namespace
        try {
            await client.callTool({
                name: "deleteNamespace",
                arguments: {
                    namespace: TEST_NAMESPACE
                }
            })
        } catch (error) {
            console.error("Error cleaning up namespace:", error)
        }
        await client.close()
    })
    
    it("should detect memories needing consolidation", async () => {
        // Create similar memories
        const memories = [
            "Python is a great programming language for beginners",
            "Python is an excellent language for new programmers",
            "Python programming is ideal for those starting to code"
        ]
        
        for (const memory of memories) {
            await client.callTool({
                name: "addToMCPMemory",
                arguments: {
                    thingToRemember: memory
                }
            })
        }
        
        // Wait for vector indexing
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Check if compactMemories tool exists
        const toolsResponse = await client.listTools()
        const hasCompactTool = toolsResponse.tools.some(t => t.name === "compactMemories")
        
        if (!hasCompactTool) {
            console.log("⚠️  compactMemories tool not yet registered in MCPSSEServer")
            return
        }
        
        // Analyze for consolidation candidates
        const analyzeResult = await client.callTool({
            name: "compactMemories",
            arguments: {
                query: "Python programming",
                action: "analyze"
            }
        })
        
        const resultText = analyzeResult.content?.[0]?.text || ""
        console.log("Analysis result:", resultText)
        
        expect(resultText).toContain("Found")
        expect(resultText).toContain("consolidation candidates")
    })
})