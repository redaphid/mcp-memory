import { describe, it, expect } from "vitest"
import { iterateAllMemories } from "./enhanced-memory-iterate"

describe("iterateAllMemories", () => {
    it("should exist", () => {
        expect(iterateAllMemories).toBeDefined()
    })

    it("should be a function", () => {
        expect(typeof iterateAllMemories).toBe("function")
    })

    it("should return an async generator", () => {
        const mockEnv = {
            DB: {
                prepare: () => ({
                    all: async () => ({ results: [] })
                })
            }
        } as any
        const result = iterateAllMemories(mockEnv)
        expect(result).toHaveProperty("next")
    })
})