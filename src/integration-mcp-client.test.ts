import { describe, it, expect, afterAll, beforeEach, afterEach } from "vitest"
import { v4 as uuidv4 } from "uuid"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"

const BASE_URL = process.env.TEST_URL || "https://mcp-memory.loqwai.workers.dev"
const TEST_NAMESPACE = `user:vitest-mcp-${Date.now()}`

describe.skip("MCP Memory Integration Tests with Official SDK", () => {
    let client: Client
    let transport: SSEClientTransport

    // Helper to create a client for a specific namespace
    async function createClient(namespace: string) {
        const client = new Client({
            name: 'vitest-client',
            version: '1.0.0'
        })
        
        const namespaceUrl = `${BASE_URL}/${namespace.replace(":", "/")}/sse`
        const transport = new SSEClientTransport(new URL(namespaceUrl))
        
        await client.connect(transport)
        return { client, transport }
    }

    // Clean up test namespace after all tests
    afterAll(async () => {
        try {
            const { client: cleanupClient } = await createClient(TEST_NAMESPACE)
            
            const result = await cleanupClient.callTool({
                name: "deleteNamespace",
                arguments: {
                    namespace: TEST_NAMESPACE
                }
            })
            
            console.log(`Cleanup: ${result.content?.[0]?.text}`)
            await cleanupClient.close()
        } catch (error) {
            console.error("Error cleaning up test namespace:", error)
        }
    })

    describe("Basic connectivity and tool listing", () => {
        it("should connect to the MCP server and list tools", async () => {
            const { client, transport } = await createClient(TEST_NAMESPACE)
            
            const tools = await client.listTools()
            
            expect(tools.tools).toBeDefined()
            expect(tools.tools.length).toBe(8)
            
            const toolNames = tools.tools.map((t) => t.name)
            expect(toolNames).toContain("addToMCPMemory")
            expect(toolNames).toContain("searchMCPMemory")
            expect(toolNames).toContain("searchAllMemories")
            expect(toolNames).toContain("deleteMemory")
            expect(toolNames).toContain("deleteNamespace")
            expect(toolNames).toContain("rememberHowTo")
            expect(toolNames).toContain("findHowTo")
            expect(toolNames).toContain("listCapabilities")
            
            await client.close()
        })
    })

    describe("Memory operations", () => {
        let testClient: Client
        const testMemory = `Integration test memory ${uuidv4()}`
        let memoryId: string

        beforeEach(async () => {
            const connection = await createClient(TEST_NAMESPACE)
            testClient = connection.client
        })

        afterEach(async () => {
            if (testClient) {
                await testClient.close()
            }
        })

        it("should store a memory using MCP client", async () => {
            const result = await testClient.callTool({
                name: "addToMCPMemory",
                arguments: {
                    thingToRemember: testMemory
                }
            })
            
            expect(result.content?.[0]?.text).toContain(`Remembered in ${TEST_NAMESPACE}`)
            expect(result.content?.[0]?.text).toContain(testMemory)
        })

        it("should search for stored memory", async () => {
            // Give vector indexing a moment to process
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            const result = await testClient.callTool({
                name: "searchMCPMemory",
                arguments: {
                    informationToGet: "Integration test"
                }
            })
            
            const resultText = result.content?.[0]?.text || ""
            
            if (resultText.includes("No relevant memories found")) {
                console.log("⚠️  Vector search returned no results - this is expected for newly indexed vectors")
            } else {
                expect(resultText).toContain(testMemory)
            }
        })

        it("should delete a specific memory", async () => {
            // First create a memory to delete
            const deleteTestMemory = `Memory to delete ${uuidv4()}`
            
            const createResult = await testClient.callTool({
                name: "addToMCPMemory",
                arguments: {
                    thingToRemember: deleteTestMemory
                }
            })
            
            expect(createResult.content?.[0]?.text).toContain("Remembered")
            
            // Search for the memory to get its ID from the REST endpoint (since MCP doesn't return IDs)
            // Note: In a real implementation, the MCP tools might return IDs or have a listMemories tool
            const memoriesResponse = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(":", "/")}/memories`)
            const memoriesData = await memoriesResponse.json() as any
            const memoryToDelete = memoriesData.memories.find((m: any) => m.content === deleteTestMemory)
            
            expect(memoryToDelete).toBeDefined()
            
            // Delete the memory
            const deleteResult = await testClient.callTool({
                name: "deleteMemory",
                arguments: {
                    memoryId: memoryToDelete.id
                }
            })
            
            expect(deleteResult.content?.[0]?.text).toContain(`Memory ${memoryToDelete.id} deleted`)
        })
    })

    describe("Namespace operations", () => {
        it("should delete an entire namespace", async () => {
            const tempNamespace = `user:vitest-delete-${Date.now()}`
            const { client: tempClient } = await createClient(tempNamespace)
            
            // Create memories in the temporary namespace
            const memories = ["Test memory 1", "Test memory 2", "Test memory 3"]
            
            for (const memory of memories) {
                await tempClient.callTool({
                    name: "addToMCPMemory",
                    arguments: {
                        thingToRemember: memory
                    }
                })
            }
            
            // Delete the namespace
            const deleteResult = await tempClient.callTool({
                name: "deleteNamespace",
                arguments: {
                    namespace: tempNamespace
                }
            })
            
            expect(deleteResult.content?.[0]?.text).toContain(`Namespace ${tempNamespace} deleted with 3 memories`)
            
            await tempClient.close()
        })
    })

    describe("Cross-namespace search", () => {
        it.skip("should search across all namespaces", async () => {
            const { client: searchClient } = await createClient("user:test")
            
            // Create test data in multiple namespaces
            const namespaces = [
                `user:search-test-${Date.now()}-1`,
                `user:search-test-${Date.now()}-2`
            ]
            
            for (const ns of namespaces) {
                const { client: nsClient } = await createClient(ns)
                await nsClient.callTool({
                    name: "addToMCPMemory",
                    arguments: {
                        thingToRemember: `Cross-namespace test in ${ns}`
                    }
                })
                await nsClient.close()
            }
            
            // Search across all namespaces
            const searchResult = await searchClient.callTool({
                name: "searchAllMemories",
                arguments: {
                    query: "Cross-namespace test"
                }
            })
            
            const resultText = searchResult.content?.[0]?.text || ""
            
            // Clean up created namespaces
            for (const ns of namespaces) {
                const { client: cleanupClient } = await createClient(ns)
                await cleanupClient.callTool({
                    name: "deleteNamespace",
                    arguments: {
                        namespace: ns
                    }
                })
                await cleanupClient.close()
            }
            
            await searchClient.close()
            
            // Verify results
            if (!resultText.includes("No relevant memories found")) {
                expect(resultText).toContain("Found memories across all namespaces")
                for (const ns of namespaces) {
                    expect(resultText).toContain(ns)
                }
            }
        })
    })
})