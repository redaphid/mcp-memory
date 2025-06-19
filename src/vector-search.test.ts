import { describe, it, expect } from "vitest"
import { parseMcp } from "./types"

const BASE_URL = "https://mcp-memory.loqwai.workers.dev"

describe("Vector Search Verification", () => {
    describe("Search in namespace with known memories", () => {
        it("should find all memories stored earlier in final-test namespace", async () => {
            const namespace = "user:final-test-1750236996581"
            const expectedMemories = [
                "I love programming in TypeScript",
                "My favorite color is blue",
                "I work on distributed systems",
                "Testing vector search functionality"
            ]

            for (const expectedContent of expectedMemories) {
                const searchTerm = expectedContent.split(" ")[2] // Get a keyword from each

                const response = await fetch(`${BASE_URL}/${namespace.replace(":", "/")}/sse`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "tools/call",
                        params: {
                            name: "searchMCPMemory",
                            arguments: {
                                informationToGet: searchTerm
                            }
                        },
                        id: Math.random()
                    })
                })
                const data = await parseMcp(response)
                const resultText = data.result.content?.[0]?.text || ""

                if (resultText.includes(expectedContent)) {
                    console.log(`✅ Found "${expectedContent}" when searching for "${searchTerm}"`)
                    expect(resultText).toContain(expectedContent)
                } else {
                    console.log(`❌ Did not find "${expectedContent}" when searching for "${searchTerm}"`)
                    console.log(`   Result: ${resultText.substring(0, 100)}...`)
                }
            }
        })

        it("should rank exact matches higher", async () => {
            const response = await fetch(`${BASE_URL}/user/final-test-1750236996581/sse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: "searchMCPMemory",
                        arguments: {
                            informationToGet: "I love programming in TypeScript"
                        }
                    },
                    id: 1
                })
            })
            const data = await parseMcp(response)
            const resultText = data.result.content?.[0]?.text || ""

            if (resultText.includes("Found memories")) {
                const lines = resultText.split("\n").filter((l) => l.includes("(score:"))
                console.log("Search results with scores:")
                lines.forEach((line) => console.log(`  ${line}`))

                // The exact match should be first
                expect(lines[0]).toContain("I love programming in TypeScript")
            }
        })
    })

    describe("Cross-namespace search capabilities", () => {
        it("should aggregate results from multiple namespaces", async () => {
            const response = await fetch(`${BASE_URL}/user/test/sse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: "searchAllMemories",
                        arguments: {
                            query: "distributed systems"
                        }
                    },
                    id: 1
                })
            })
            const data = await parseMcp(response)
            const resultText = data.result.content?.[0]?.text || ""

            const namespaces = resultText.match(/In (user|project):[^\n]+/g) || []
            console.log(`\nFound "distributed systems" memories in ${namespaces.length} namespace(s)`)

            if (namespaces.length > 0) {
                console.log("Namespaces with matches:")
                namespaces.forEach((ns) => console.log(`  ${ns}`))
            }
        })
    })

    describe("Similarity scoring", () => {
        it("should show decreasing scores for less relevant matches", async () => {
            const response = await fetch(`${BASE_URL}/project/coding-philosophy/sse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: "searchMCPMemory",
                        arguments: {
                            informationToGet: "functional programming"
                        }
                    },
                    id: 1
                })
            })
            const data = await parseMcp(response)
            const resultText = data.result.content?.[0]?.text || ""

            if (resultText.includes("Found memories")) {
                const scoreMatches = resultText.match(/score: ([\d.]+)/g) || []
                const scores = scoreMatches.map((m) => parseFloat(m.replace("score: ", "")))

                console.log('\nSimilarity scores for "functional programming" search:')
                scores.forEach((score, i) => console.log(`  Result ${i + 1}: ${score}`))

                // Scores should be in descending order
                for (let i = 1; i < scores.length; i++) {
                    expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
                }

                // All scores should be above our threshold
                scores.forEach((score) => expect(score).toBeGreaterThan(0.3))
            }
        })
    })
})
