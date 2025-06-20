import { describe, it, expect } from "vitest"
import { searchMemoriesWithContext } from "./enhanced-memory-search"

describe("searchMemoriesWithContext", () => {
    it("should exist", () => {
        expect(searchMemoriesWithContext).toBeDefined()
    })

    it("should be a function", () => {
        expect(typeof searchMemoriesWithContext).toBe("function")
    })

    it("should return a promise", () => {
        const result = searchMemoriesWithContext("test", "user:test", {} as Env)
        expect(result).toBeInstanceOf(Promise)
    })

    it("should accept a query parameter", async () => {
        const result = await searchMemoriesWithContext("test query", "user:test", {} as Env)
        expect(result).toBeDefined()
    })

    it("should accept query, namespace, and env parameters", async () => {
        const result = await searchMemoriesWithContext("test query", "user:test", {} as Env)
        expect(result).toEqual([])
    })
})