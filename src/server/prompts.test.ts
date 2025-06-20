import { describe, it, expect, beforeEach } from "vitest"
import { getPromptsList, handlePromptsGet } from "./prompts"
import { MCPRequest } from "../types/mcp"

describe("periodic_update_philosophy prompt", () => {
    it("should exist in prompts list", () => {
        const prompts = getPromptsList()
        const periodicPrompt = prompts.find((p) => p.name === "periodic_update_philosophy")
        expect(periodicPrompt).toBeDefined()
    })

    it("should have a description", () => {
        const prompts = getPromptsList()
        const periodicPrompt = prompts.find((p) => p.name === "periodic_update_philosophy")
        expect(periodicPrompt?.description).toBe("🔄 Periodic update - Refresh and sync coding philosophy memories")
    })

    describe("when getting periodic_update_philosophy prompt", () => {
        let result: any

        beforeEach(async () => {
            const request: MCPRequest = {
                jsonrpc: "2.0",
                id: 1,
                method: "prompts/get",
                params: {
                    name: "periodic_update_philosophy",
                    arguments: {}
                }
            }
            result = await handlePromptsGet(request)
        })

        it("should return valid response", () => {
            expect(result.jsonrpc).toBe("2.0")
            expect(result.id).toBe(1)
            expect(result.result).toBeDefined()
        })

        it("should contain periodic update message", () => {
            expect(result.result.messages[0].content.text).toBe(
                "🔄 PERIODIC UPDATE REQUIRED:\n\nSearch and refresh your coding philosophy knowledge. Perform comprehensive searches to update your understanding of current patterns and practices."
            )
        })
    })
})
