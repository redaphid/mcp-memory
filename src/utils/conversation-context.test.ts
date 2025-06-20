import { describe, it, expect, vi, beforeEach } from "vitest"
import { storeMemoryWithContext } from "./conversation-context"

describe("storeMemoryWithContext", () => {
    it("should exist", () => {
        expect(storeMemoryWithContext).toBeDefined()
    })

    it("should be a function", () => {
        expect(typeof storeMemoryWithContext).toBe("function")
    })

    describe("when storing memory with conversation context", () => {
        let result

        beforeEach(async () => {
            const conversationContext = [
                { role: "user", content: "How do I implement this?" },
                { role: "assistant", content: "Let me help you with that." }
            ]
            result = await storeMemoryWithContext("test memory", conversationContext)
        })

        it("should return memory ID", () => {
            expect(result).toBe("test-memory-id")
        })
    })

    describe("when storing different memory content", () => {
        let result

        beforeEach(async () => {
            const conversationContext = [
                { role: "user", content: "Save this pattern" },
                { role: "assistant", content: "Storing pattern now" }
            ]
            result = await storeMemoryWithContext("pattern memory", conversationContext)
        })

        it("should return different memory ID", () => {
            expect(result).toBe("pattern-memory-id")
        })
    })

    describe("when storing with real environment", () => {
        let result

        beforeEach(async () => {
            const mockEnv = { DB: { prepare: () => ({ bind: () => ({ run: async () => {} }) }) } } as any
            const conversationContext = [{ role: "user", content: "test" }]
            result = await storeMemoryWithContext("real memory", conversationContext, mockEnv)
        })

        it("should return generated memory ID", () => {
            expect(result).toMatch(/^mem-/)
        })
    })

    describe("when storing with database calls", () => {
        let mockPrepare
        let result

        beforeEach(async () => {
            mockPrepare = vi.fn().mockReturnValue({
                bind: vi.fn().mockReturnValue({
                    run: vi.fn().mockResolvedValue({})
                })
            })
            const mockEnv = { DB: { prepare: mockPrepare } } as any
            const conversationContext = [{ role: "user", content: "test" }]
            result = await storeMemoryWithContext("db memory", conversationContext, mockEnv)
        })

        it("should call database prepare", () => {
            expect(mockPrepare).toHaveBeenCalled()
        })
    })

    describe("when storing with full database execution", () => {
        let mockBind
        let mockRun
        let result

        beforeEach(async () => {
            mockRun = vi.fn().mockResolvedValue({})
            mockBind = vi.fn().mockReturnValue({ run: mockRun })
            const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })
            const mockEnv = { DB: { prepare: mockPrepare } } as any
            const conversationContext = [{ role: "user", content: "test" }]
            result = await storeMemoryWithContext("execute memory", conversationContext, mockEnv)
        })

        it("should execute database query", () => {
            expect(mockRun).toHaveBeenCalled()
        })
    })

    describe("when storing conversation context in database", () => {
        let mockBind
        let mockRun
        let result

        beforeEach(async () => {
            mockRun = vi.fn().mockResolvedValue({})
            mockBind = vi.fn().mockReturnValue({ run: mockRun })
            const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })
            const mockEnv = { DB: { prepare: mockPrepare } } as any
            const conversationContext = [
                { role: "user", content: "How to save context?" },
                { role: "assistant", content: "Let me store that for you." }
            ]
            result = await storeMemoryWithContext("context memory", conversationContext, mockEnv)
        })

        it("should bind conversation context to database", () => {
            expect(mockBind).toHaveBeenCalledWith(
                expect.any(String), // memory ID
                expect.any(String), // namespace
                "context memory", // content
                JSON.stringify([
                    { role: "user", content: "How to save context?" },
                    { role: "assistant", content: "Let me store that for you." }
                ])
            )
        })
    })

    describe("when storing with generated memory ID", () => {
        let result1
        let result2

        beforeEach(async () => {
            const mockRun = vi.fn().mockResolvedValue({})
            const mockBind = vi.fn().mockReturnValue({ run: mockRun })
            const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })
            const mockEnv = { DB: { prepare: mockPrepare } } as any
            const conversationContext = [{ role: "user", content: "test" }]

            result1 = await storeMemoryWithContext("generate memory 1", conversationContext, mockEnv)
            result2 = await storeMemoryWithContext("generate memory 2", conversationContext, mockEnv)
        })

        it("should generate unique memory IDs", () => {
            expect(result1).not.toBe(result2)
            expect(result1).toMatch(/^mem-/)
            expect(result2).toMatch(/^mem-/)
        })
    })

    describe("when storing with custom namespace", () => {
        let mockBind
        let result

        beforeEach(async () => {
            mockBind = vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) })
            const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })
            const mockEnv = { DB: { prepare: mockPrepare } } as any
            const conversationContext = [{ role: "user", content: "test" }]

            result = await storeMemoryWithContext("namespace memory", conversationContext, mockEnv, "project:test")
        })

        it("should use custom namespace", () => {
            expect(mockBind).toHaveBeenCalledWith(
                expect.any(String), // memory ID
                "project:test", // custom namespace
                "namespace memory", // content
                expect.any(String) // conversation context JSON
            )
        })
    })

    describe("when storing any memory content", () => {
        let mockBind
        let result

        beforeEach(async () => {
            mockBind = vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({}) })
            const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind })
            const mockEnv = { DB: { prepare: mockPrepare } } as any
            const conversationContext = [{ role: "user", content: "any content" }]

            result = await storeMemoryWithContext("any random memory", conversationContext, mockEnv, "user:bob")
        })

        it("should store any content with conversation context", () => {
            expect(mockBind).toHaveBeenCalledWith(
                expect.stringMatching(/^mem-/), // generated memory ID
                "user:bob", // namespace
                "any random memory", // content
                JSON.stringify([{ role: "user", content: "any content" }]) // conversation context
            )
            expect(result).toMatch(/^mem-/)
        })
    })
})
