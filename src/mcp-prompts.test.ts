import { describe, it, expect } from "vitest"
import { getContextualPrompt } from "./mcp-prompts"

describe("getContextualPrompt", () => {
    it("should exist", () => {
        expect(getContextualPrompt).toBeDefined()
    })

    it("should be a function", () => {
        expect(typeof getContextualPrompt).toBe("function")
    })
})