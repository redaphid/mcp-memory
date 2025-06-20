import { describe, it, expect } from "vitest"
import { scoreWithVectorStore } from "./relevance-scoring"

describe("scoreWithVectorStore", () => {
    it("should exist", () => {
        expect(scoreWithVectorStore).toBeDefined()
    })

    it("should be a function", () => {
        expect(typeof scoreWithVectorStore).toBe("function")
    })

    it("should accept memories array and env", async () => {
        const result = await scoreWithVectorStore([], {} as Env)
        expect(result).toEqual([])
    })
})