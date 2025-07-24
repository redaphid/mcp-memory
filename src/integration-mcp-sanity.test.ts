import { describe, it, expect } from "vitest"
import { Client } from "@moinfra/mcp-client-sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@moinfra/mcp-client-sdk/client/streamableHttp.js"

describe("MCP Client SDK Sanity Check", () => {
    it("should connect to Cloudflare MCP server and get tool list", async () => {
        // Create transport and client
        const url = new URL("https://mcp-memory.loqwai.workers.dev/user/test/sse")
        const transport = new StreamableHTTPClientTransport(url)
        const client = new Client({
            name: 'sanity-test-client',
            version: '1.0.0'
        })
        
        // Connect
        await client.connect(transport)
        
        // List tools
        const response = await client.listTools()
        const toolNames = response.tools.map(t => t.name)
        
        // Verify we got tools back
        expect(toolNames).toBeDefined()
        expect(Array.isArray(toolNames)).toBe(true)
        expect(toolNames.length).toBeGreaterThan(0)
        
        // Check for some expected tools
        expect(toolNames).toContain("addToMCPMemory")
        expect(toolNames).toContain("searchMCPMemory")
        
        console.log("✅ Successfully connected and retrieved tools:", toolNames)
        
        // Clean up
        await client.close()
    })
})