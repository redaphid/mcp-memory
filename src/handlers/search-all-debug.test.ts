import { describe, it, expect, beforeEach } from "vitest"
import { searchAllMemoriesHandler } from "./memory-tools"

describe("searchAllMemoriesHandler debug", () => {
    it("should exist", () => {
        expect(searchAllMemoriesHandler).toBeDefined()
    })

    describe("when called with mock env", () => {
        let result

        beforeEach(async () => {
            const mockEnv = {
                DB: {
                    prepare: () => ({
                        all: async () => ({ results: [] })
                    })
                }
            } as any

            result = await searchAllMemoriesHandler({ query: "test" }, { env: mockEnv })
        })

        it("should return defined result", () => {
            expect(result).toBeDefined()
        })
    })

    describe("when database throws error", () => {
        let result

        beforeEach(async () => {
            const mockEnv = {
                DB: {
                    prepare: () => {
                        throw new Error("Database connection failed")
                    }
                }
            } as any

            result = await searchAllMemoriesHandler({ query: "test" }, { env: mockEnv })
        })

        it("should still return defined result", () => {
            expect(result).toBeDefined()
        })

        it("should have error message content", () => {
            expect(result.content[0].text).toContain("Error searching across namespaces")
        })
    })

    describe("when called via MCP server wrapper", () => {
        let result

        beforeEach(async () => {
            // Test what happens in the actual MCP server flow
            const mockEnv = {
                DB: {
                    prepare: () => ({
                        all: async () => ({ results: [] })
                    })
                }
            } as any

            // Simulate the exact MCP server call pattern
            try {
                const handlerResult = await searchAllMemoriesHandler({ query: "test" }, { env: mockEnv })
                result = { jsonrpc: "2.0", id: 1, result: handlerResult }
            } catch (error) {
                result = {
                    jsonrpc: "2.0",
                    id: 1,
                    error: {
                        code: -32603,
                        message: "Tool execution failed",
                        data: error instanceof Error ? error.message : String(error)
                    }
                }
            }
        })

        it("should return valid MCP response structure", () => {
            expect(result).toBeDefined()
            expect(result.jsonrpc).toBe("2.0")
            expect(result.id).toBe(1)
            expect(result.result || result.error).toBeDefined()
        })

        it("should have result field not error field", () => {
            expect(result.result).toBeDefined()
            expect(result.error).toBeUndefined()
        })
    })
})
