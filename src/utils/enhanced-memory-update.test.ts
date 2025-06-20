import { describe, it, expect } from "vitest"
import { updateMemory } from "./enhanced-memory-update"

describe("updateMemory", () => {
    it("should exist", () => {
        expect(updateMemory).toBeDefined()
    })

    it("should be a function", () => {
        expect(typeof updateMemory).toBe("function")
    })

    it("should accept memory id and updates", async () => {
        const mockEnv = {
            DB: {
                prepare: () => ({
                    bind: () => ({
                        run: async () => ({ meta: { changes: 1 } })
                    })
                })
            }
        } as any
        const result = await updateMemory("test-id", { content: "new content" }, mockEnv)
        expect(result).toEqual({ success: true })
    })
})