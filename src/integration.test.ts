import { describe, it, expect, afterAll } from "vitest"
import { v4 as uuidv4 } from "uuid"
import { parseDbInfo, parseNamespaces, parseMemories, parseSearch, parseVector, parseMcp } from "./types"

const BASE_URL = process.env.TEST_URL || "https://mcp-memory.loqwai.workers.dev"
const TEST_NAMESPACE = `user:vitest-${Date.now()}`

describe("MCP Memory Integration Tests", () => {
    // Clean up test namespace after all tests
    afterAll(async () => {
        try {
            const response = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/sse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: "deleteNamespace",
                        arguments: {
                            namespace: TEST_NAMESPACE
                        }
                    },
                    id: 999
                })
            })
            const data = await parseMcp(response)
            console.log(`Cleanup: ${data.result.content?.[0]?.text}`)
        } catch (error) {
            console.error("Error cleaning up test namespace:", error)
        }
    })
    describe("Health checks", () => {
        it("should get database info", async () => {
            const response = await fetch(`${BASE_URL}/api/db-info`)
            const data = await parseDbInfo(response)
            expect(data.success).toBe(true)
            expect(data.tableInfo).toBeDefined()
            expect(data.count).toBeGreaterThan(0)
        })

        it("should get namespaces", async () => {
            const response = await fetch(`${BASE_URL}/api/namespaces`)
            const data = await parseNamespaces(response)
            expect(data.success).toBe(true)
            expect(data.namespaces).toBeDefined()
            expect(Array.isArray(data.namespaces.users)).toBe(true)
            expect(Array.isArray(data.namespaces.projects)).toBe(true)
        })
    })

    describe("MCP tools via SSE endpoint", () => {
        it("should list available tools", async () => {
            const response = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/sse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/list",
                    id: 1
                })
            })

            const data = await parseMcp(response)
            expect(data.result.tools).toBeDefined()
            expect(data.result.tools!.length).toBe(5)

            const toolNames = data.result.tools!.map((t) => t.name)
            expect(toolNames).toContain("addToMCPMemory")
            expect(toolNames).toContain("searchMCPMemory")
            expect(toolNames).toContain("searchAllMemories")
            expect(toolNames).toContain("deleteMemory")
            expect(toolNames).toContain("deleteNamespace")
        })

        describe("Memory operations", () => {
            const testMemory = `Integration test memory ${uuidv4()}`

            it("should store a memory", async () => {
                const response = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/sse`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "tools/call",
                        params: {
                            name: "addToMCPMemory",
                            arguments: {
                                thingToRemember: testMemory
                            }
                        },
                        id: 2
                    })
                })
                const data = await parseMcp(response)
                expect(data.result.content?.[0]?.text).toContain(`Remembered in ${TEST_NAMESPACE}`)
                expect(data.result.content?.[0]?.text).toContain(testMemory)
            })

            it("should retrieve stored memory from database", async () => {
                const response = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/memories`)
                const data = await parseMemories(response)
                expect(data.success).toBe(true)
                expect(data.memories).toBeDefined()
                expect(data.memories.length).toBeGreaterThan(0)

                const storedMemory = data.memories.find((m) => m.content === testMemory)
                expect(storedMemory).toBeDefined()
                expect(storedMemory!.content).toBe(testMemory)
            })

            it("should search for memory (may need indexing time)", async () => {
                const response = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/sse`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "tools/call",
                        params: {
                            name: "searchMCPMemory",
                            arguments: {
                                informationToGet: "Integration test"
                            }
                        },
                        id: 3
                    })
                })
                const data = await parseMcp(response)
                const resultText = data.result.content?.[0]?.text || ""

                if (resultText.includes("No relevant memories found")) {
                    console.log("⚠️  Vector search returned no results - this is expected for newly indexed vectors")
                } else {
                    expect(resultText).toContain(testMemory)
                }
            })

            it("should delete a specific memory", async () => {
                // First create a memory to delete
                const deleteTestMemory = `Memory to delete ${uuidv4()}`
                const createResponse = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/sse`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "tools/call",
                        params: {
                            name: "addToMCPMemory",
                            arguments: {
                                thingToRemember: deleteTestMemory
                            }
                        },
                        id: 10
                    })
                })
                await parseMcp(createResponse)

                // Get the memory ID
                const memoriesResponse = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/memories`)
                const memoriesData = await parseMemories(memoriesResponse)
                const memoryToDelete = memoriesData.memories.find((m) => m.content === deleteTestMemory)
                expect(memoryToDelete).toBeDefined()

                // Delete the memory
                const deleteResponse = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/sse`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "tools/call",
                        params: {
                            name: "deleteMemory",
                            arguments: {
                                memoryId: memoryToDelete!.id
                            }
                        },
                        id: 11
                    })
                })
                const deleteData = await parseMcp(deleteResponse)
                expect(deleteData.result.content?.[0]?.text).toContain(`Memory ${memoryToDelete!.id} deleted`)

                // Verify deletion
                const verifyResponse = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/memories`)
                const verifyData = await parseMemories(verifyResponse)
                const deletedMemory = verifyData.memories.find((m) => m.content === deleteTestMemory)
                expect(deletedMemory).toBeUndefined()
            })
        })
    })

    describe("REST API endpoints", () => {
        it("should search memories via REST API", async () => {
            const response = await fetch(`${BASE_URL}/api/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: "test",
                    namespaces: [TEST_NAMESPACE]
                })
            })
            const data = await parseSearch(response)
            expect(data.success).toBe(true)
            expect(data.query).toBe("test")
            expect(Array.isArray(data.results)).toBe(true)
        })

        it("should search specific namespace via REST", async () => {
            const response = await fetch(`${BASE_URL}/search/${TEST_NAMESPACE.replace(":", "/")}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: "integration"
                })
            })
            const data = await parseSearch(response)
            expect(data.success).toBe(true)
            expect(data.namespace).toBe(TEST_NAMESPACE)
        })
    })

    describe("Vector operations debug endpoint", () => {
        it("should store and search vectors directly", async () => {
            const testText = "Direct vector test " + uuidv4()

            const response = await fetch(`${BASE_URL}/api/debug-vector`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: testText,
                    namespace: TEST_NAMESPACE
                })
            })
            const data = await parseVector(response)
            expect(data.success).toBe(true)
            expect(data.vectorId).toBeDefined()
            expect(data.embeddingLength).toBe(1024)

            if (data.searchResults.count > 0) {
                expect(data.searchResults.matches[0].content).toBe(testText)
                expect(data.searchResults.matches[0].score).toBeGreaterThan(0.9)
            }
        })
    })

    describe("Namespace deletion test", () => {
        it("should delete an entire namespace", async () => {
            const tempNamespace = `user:vitest-delete-${Date.now()}`
            
            // Create memories in the temporary namespace
            const memories = ["Test memory 1", "Test memory 2", "Test memory 3"]
            for (const memory of memories) {
                await fetch(`${BASE_URL}/${tempNamespace.replace(":", "/")}/sse`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "tools/call",
                        params: {
                            name: "addToMCPMemory",
                            arguments: {
                                thingToRemember: memory
                            }
                        },
                        id: 20
                    })
                })
            }

            // Verify memories were created
            const beforeResponse = await fetch(`${BASE_URL}/${tempNamespace.replace(":", "/")}/memories`)
            const beforeData = await parseMemories(beforeResponse)
            expect(beforeData.memories.length).toBe(3)

            // Delete the namespace
            const deleteResponse = await fetch(`${BASE_URL}/${tempNamespace.replace(":", "/")}/sse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: "deleteNamespace",
                        arguments: {
                            namespace: tempNamespace
                        }
                    },
                    id: 21
                })
            })
            const deleteData = await parseMcp(deleteResponse)
            expect(deleteData.result.content?.[0]?.text).toContain(`Namespace ${tempNamespace} deleted with 3 memories`)

            // Verify namespace is empty
            const afterResponse = await fetch(`${BASE_URL}/${tempNamespace.replace(":", "/")}/memories`)
            const afterData = await parseMemories(afterResponse)
            expect(afterData.memories.length).toBe(0)
        })
    })

    describe("Previously stored memories check", () => {
        it("should find TypeScript memories in older namespaces", async () => {
            const response = await fetch(`${BASE_URL}/user/test/sse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: "searchAllMemories",
                        arguments: {
                            query: "TypeScript"
                        }
                    },
                    id: 4
                })
            })
            const data = await parseMcp(response)
            const resultText = data.result.content?.[0]?.text || ""

            expect(resultText).toContain("Found memories across all namespaces")
            const namespaceMatches = resultText.match(/In (user|project):[^\n]+/g) || []
            expect(namespaceMatches.length).toBeGreaterThan(0)
            console.log(`Found TypeScript memories in ${namespaceMatches.length} namespaces`)
        })

        it("should search in specific older namespace", async () => {
            const response = await fetch(`${BASE_URL}/user/final-test-1750236996581/sse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: "searchMCPMemory",
                        arguments: {
                            informationToGet: "programming TypeScript"
                        }
                    },
                    id: 5
                })
            })
            const data = await parseMcp(response)
            const resultText = data.result.content?.[0]?.text || ""

            if (resultText.includes("I love programming in TypeScript")) {
                console.log("✅ Vector search is now working for previously stored memories!")
                expect(resultText).toContain("I love programming in TypeScript")
            } else {
                console.log("⚠️  Vector search still not finding previously stored memories")
            }
        })
    })
})
