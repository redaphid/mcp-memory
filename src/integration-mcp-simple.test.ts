import { describe, it, expect } from "vitest"

const BASE_URL = process.env.TEST_URL || "https://mcp-memory.loqwai.workers.dev"
const TEST_NAMESPACE = `user:vitest-${Date.now()}`

describe("Simple MCP HTTP Integration Test", () => {
    it("should initialize MCP connection via POST", async () => {
        const response = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/sse`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "initialize",
                params: {
                    protocolVersion: "2024-11-05",
                    capabilities: {},
                    clientInfo: {
                        name: "vitest-simple",
                        version: "1.0.0"
                    }
                },
                id: 1
            })
        })

        expect(response.ok).toBe(true)
        expect(response.status).toBe(200)
        
        const result = await response.json()
        expect(result.jsonrpc).toBe("2.0")
        expect(result.id).toBe(1)
        expect(result.result).toBeDefined()
        expect(result.result.protocolVersion).toBe("2024-11-05")
        expect(result.result.serverInfo.name).toBe("MCP Memory")
    })
})