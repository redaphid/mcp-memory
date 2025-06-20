import { describe, it, expect, vi, beforeEach } from "vitest"
import { addToMCPMemoryWithContext } from "./memory-tools"

// Mock the storeMemoryWithContext function
vi.mock("../utils/conversation-context", () => ({
    storeMemoryWithContext: vi.fn()
}))

describe("addToMCPMemoryWithContext", () => {
    it("should exist", () => {
        expect(addToMCPMemoryWithContext).toBeDefined()
    })

    it("should be a function", () => {
        expect(typeof addToMCPMemoryWithContext).toBe("function")
    })

    describe("when storing memory with conversation context", () => {
        let result

        beforeEach(async () => {
            const args = {
                thingToRemember: "test memory"
            }
            const context = {
                namespace: "user:test",
                env: { DB: { prepare: () => ({ bind: () => ({ run: async () => {} }) }) } } as any
            }
            result = await addToMCPMemoryWithContext(args, context)
        })

        it("should return success content", () => {
            expect(result).toEqual({
                content: [
                    {
                        type: "text",
                        text: "Remembered with context in user:test: test memory"
                    }
                ]
            })
        })
    })

    describe("when storing different memory with different namespace", () => {
        let result

        beforeEach(async () => {
            const args = {
                thingToRemember: "pattern memory"
            }
            const context = {
                namespace: "project:frontend",
                env: { DB: { prepare: () => ({ bind: () => ({ run: async () => {} }) }) } } as any
            }
            result = await addToMCPMemoryWithContext(args, context)
        })

        it("should return success with different namespace and content", () => {
            expect(result).toEqual({
                content: [
                    {
                        type: "text",
                        text: "Remembered with context in project:frontend: pattern memory"
                    }
                ]
            })
        })
    })

    describe("when actually storing memory", () => {
        let mockStoreMemoryWithContext
        let result

        beforeEach(async () => {
            const { storeMemoryWithContext } = await import("../utils/conversation-context")
            mockStoreMemoryWithContext = vi.mocked(storeMemoryWithContext)
            mockStoreMemoryWithContext.mockResolvedValue("mem-12345")

            const args = {
                thingToRemember: "store this",
                conversationContext: [
                    { role: "user", content: "Store this pattern" },
                    { role: "assistant", content: "Storing now" }
                ]
            }
            const context = {
                namespace: "user:test",
                env: { DB: "mock-db" } as any
            }
            result = await addToMCPMemoryWithContext(args, context)
        })

        it("should call storeMemoryWithContext with correct parameters", () => {
            expect(mockStoreMemoryWithContext).toHaveBeenCalledWith(
                "store this",
                [
                    { role: "user", content: "Store this pattern" },
                    { role: "assistant", content: "Storing now" }
                ],
                { DB: "mock-db" },
                "user:test"
            )
        })

        it("should return memory ID in response", () => {
            expect(result).toEqual({
                content: [
                    {
                        type: "text",
                        text: "Remembered with context in user:test: store this (ID: mem-12345)"
                    }
                ]
            })
        })
    })
})
