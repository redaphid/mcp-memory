import { describe, it, expect, beforeEach } from "vitest"
import { deleteMemoryFromD1, getAllMemoriesFromD1, getDeletedMemoriesFromD1 } from "./db"

describe("Soft delete functionality", () => {
    describe("when checking for deleted memories function", () => {
        it("should have getDeletedMemoriesFromD1 function", () => {
            expect(getDeletedMemoriesFromD1).toBeDefined()
        })

        it("should be a function", () => {
            expect(typeof getDeletedMemoriesFromD1).toBe('function')
        })

        it("should accept namespace and env parameters", async () => {
            const result = await getDeletedMemoriesFromD1("test:namespace", {} as Env)
            expect(result).toBeDefined()
        })

        it("should return an array", async () => {
            const result = await getDeletedMemoriesFromD1("test:namespace", {} as Env)
            expect(Array.isArray(result)).toBe(true)
        })
    })
})