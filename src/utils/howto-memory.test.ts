import { describe, it, expect, beforeEach } from "vitest"
import { rememberHowTo, findHowTo, listCapabilities } from "./howto-memory"

describe("rememberHowTo", () => {
    it("should exist", () => {
        expect(rememberHowTo).toBeDefined()
    })
    
    it("should be a function", () => {
        expect(typeof rememberHowTo).toBe("function")
    })
    
    describe("when calling with minimal valid input", () => {
        let mockEnv: any
        let result: any
        
        beforeEach(async () => {
            mockEnv = {
                DB: {
                    prepare: () => ({
                        bind: () => ({
                            run: async () => ({ success: true })
                        })
                    })
                },
                AI: {
                    run: async () => ({ data: [[0.1, 0.2, 0.3]] })
                },
                VECTORIZE: {
                    upsert: async () => ({ success: true })
                }
            }
            
            result = await rememberHowTo("test", [{ order: 1, action: "do something" }], mockEnv)
        })
        
        it("should return an object with id and howto", () => {
            expect(result).toHaveProperty("id")
            expect(result).toHaveProperty("howto")
        })
    })
})

describe("findHowTo", () => {
    it("should exist", () => {
        expect(findHowTo).toBeDefined()
    })
    
    it("should be a function", () => {
        expect(typeof findHowTo).toBe("function")
    })
    
    describe("when searching for howtos", () => {
        let mockEnv: any
        let result: any
        
        beforeEach(async () => {
            mockEnv = {
                AI: {
                    run: async () => ({ data: [[0.1, 0.2, 0.3]] })
                },
                VECTORIZE: {
                    query: async () => ({ matches: [] })
                }
            }
            
            result = await findHowTo("test query", mockEnv)
        })
        
        it("should return an array", () => {
            expect(Array.isArray(result)).toBe(true)
        })
    })
})

describe("listCapabilities", () => {
    it("should exist", () => {
        expect(listCapabilities).toBeDefined()
    })
    
    it("should be a function", () => {
        expect(typeof listCapabilities).toBe("function")
    })
    
    describe("when listing capabilities", () => {
        let mockEnv: any
        let result: any
        
        beforeEach(async () => {
            mockEnv = {
                DB: {
                    prepare: () => ({
                        bind: () => ({
                            all: async () => ({ results: [] })
                        })
                    })
                }
            }
            
            result = await listCapabilities(mockEnv)
        })
        
        it("should return an array", () => {
            expect(Array.isArray(result)).toBe(true)
        })
    })
})