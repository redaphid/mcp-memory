import { describe, it, expect, beforeEach } from "vitest"
import { storeMemoryWithContext } from "./enhanced-memory"
import { StoreMemoryWithContextParams } from "../types/memory"

describe("storeMemoryWithContext", () => {
    it("should exist", () => {
        expect(storeMemoryWithContext).toBeDefined()
    })

    it("should be a function", () => {
        expect(typeof storeMemoryWithContext).toBe("function")
    })

    describe("when storing a memory with context", () => {
        let result: any
        
        beforeEach(async () => {
            result = await storeMemoryWithContext(
                "Test memory content",
                "user:test",
                {} as Env,
                []
            )
        })

        it("should return a memory ID", () => {
            expect(result).toHaveProperty("memoryId")
            expect(typeof result.memoryId).toBe("string")
        })
    })

    describe("when storing different memory content", () => {
        let result: any
        
        beforeEach(async () => {
            result = await storeMemoryWithContext(
                "Different content",
                "user:test",
                {} as Env,
                []
            )
        })

        it("should return a memory ID", () => {
            expect(result).toHaveProperty("memoryId")
            expect(typeof result.memoryId).toBe("string")
        })
    })

    it("should accept proper parameters object", async () => {
        const params: StoreMemoryWithContextParams = {
            content: "test",
            namespace: "user:test",
            env: {} as Env
        }
        const result = await storeMemoryWithContext(params)
        expect(result).toHaveProperty("memoryId")
        expect(typeof result.memoryId).toBe("string")
    })

    it("should generate unique IDs", async () => {
        const result = await storeMemoryWithContext(
            "Test memory",
            "user:test",
            {} as Env,
            []
        )
        expect(result.memoryId).not.toBe("test-id")
    })
})