import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { McpAgent } from "agents/mcp"
import { z } from "zod"
import { storeMemoryInD1 } from "./utils/db"
import { searchMemories, storeMemory } from "./utils/vectorize"
import { version } from "../package.json"

type MyMCPProps = {
    namespace: string // e.g., "user:alice", "project:frontend", "all"
    namespaceType: "user" | "project" | "all"
}

export class MyMCP extends McpAgent<Env, {}, MyMCPProps> {
    server = new McpServer({
        name: "MCP Memory",
        version
    })

    async init() {
        const env = this.env as Env

        this.server.tool(
            "addToMCPMemory",
            `This tool stores important information in a persistent memory layer. Use it when:
      1. User explicitly asks to remember something ("remember this...")
      2. You detect significant user preferences, traits, or patterns worth preserving
      3. Technical details, examples, or emotional responses emerge that would be valuable in future interactions
      4. Important project information, documentation, or code patterns should be preserved

      The memory will be stored in the current namespace (user, project, or organization-wide).

      To automatically detect and use the project namespace for the current directory:
      1. First, check if we're in a git repository: git rev-parse --is-inside-work-tree
      2. If yes, get the remote URL: git config --get remote.origin.url
      3. Extract project name from URL patterns:
         - SSH: git@github.com:owner/project.git → project
         - HTTPS: https://github.com/owner/project.git → project
         - gitlab.com/user/repo.git → repo
         - Custom domain: git@custom.com:team/repo.git → repo
      4. Convert to project namespace: project:{extracted-name}
      5. Store memories with: addToMCPMemory after switching to project namespace

      Example: If in /home/user/myproject with origin github.com/alice/myproject.git
      The namespace would be: project:myproject

      This tool must be invoked through a function call - it is not a passive resource but an active storage mechanism.`,
            {
                thingToRemember: z.string().describe("The information to remember"),
                namespace: z
                    .string()
                    .optional()
                    .describe(
                        "Optional namespace to store the memory in (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
                    )
            },
            async ({ thingToRemember, namespace }: { thingToRemember: string; namespace?: string }) => {
                try {
                    const targetNamespace = namespace || this.props.namespace
                    // Store in Vectorize using the refactored function
                    const memoryId = await storeMemory(thingToRemember, targetNamespace, env)

                    // Also store content in D1 database
                    await storeMemoryInD1(thingToRemember, targetNamespace, env, memoryId)

                    console.log(
                        `Memory stored successfully in namespace '${targetNamespace}' with ID: ${memoryId}, content: "${thingToRemember}"`
                    )

                    return {
                        content: [{ type: "text", text: `Remembered in ${targetNamespace}: ${thingToRemember}` }]
                    }
                } catch (error) {
                    console.error("Error storing memory:", error)
                    return {
                        content: [{ type: "text", text: "Failed to remember: " + String(error) }]
                    }
                }
            }
        )

        this.server.tool(
            "searchMCPMemory",
            `This tool searches the persistent memory layer for relevant information, preferences, and past context.
      It uses semantic matching to find connections between your query and stored memories, even when exact keywords don't match.
      Use this tool when:
      1. You need historical context about the user's preferences or past interactions
      2. You need to find project-specific information, documentation, or code patterns
      3. The user refers to something they previously mentioned or asked you to remember
      4. You need to verify if specific information exists in the current namespace

      The search is performed within the current namespace (user, project, or organization-wide).

      To automatically detect and use the project namespace for the current directory:
      1. First, check if we're in a git repository: git rev-parse --is-inside-work-tree
      2. If yes, get the remote URL: git config --get remote.origin.url
      3. Extract project name from URL patterns:
         - SSH: git@github.com:owner/project.git → project
         - HTTPS: https://github.com/owner/project.git → project
         - gitlab.com/user/repo.git → repo
         - Custom domain: git@custom.com:team/repo.git → repo
      4. Convert to project namespace: project:{extracted-name}

      5. Search memories with: searchMCPMemory after switching to project namespace

      Example: If in /home/user/myproject with origin github.com/alice/myproject.git
      The namespace would be: project:myproject

      This tool must be explicitly invoked through a function call - it is not a passive resource but an active search mechanism.`,
            {
                informationToGet: z.string().describe("The information to search for"),
                namespace: z
                    .string()
                    .optional()
                    .describe(
                        "Optional namespace to search in (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
                    )
            },
            async ({ informationToGet, namespace }: { informationToGet: string; namespace?: string }) => {
                try {
                    const targetNamespace = namespace || this.props.namespace
                    console.log(`Searching in namespace '${targetNamespace}' with query: "${informationToGet}"`)

                    // Use the refactored function to search memories
                    const memories = await searchMemories(informationToGet, targetNamespace, env)

                    console.log(`Search returned ${memories.length} matches`)

                    if (memories.length > 0) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text:
                                        `Found memories in ${targetNamespace}:\n` +
                                        memories.map((m) => `${m.content} (score: ${m.score.toFixed(4)})`).join("\n")
                                }
                            ]
                        }
                    }

                    return {
                        content: [{ type: "text", text: `No relevant memories found in ${targetNamespace}.` }]
                    }
                } catch (error) {
                    console.error("Error searching memories:", error)
                    return {
                        content: [{ type: "text", text: "Failed to search memories: " + String(error) }]
                    }
                }
            }
        )

        // Add capability to search across all namespaces
        this.server.tool(
            "searchAllMemories",
            "This tool searches across all namespaces to find relevant memories. Use when you need to find information that might be stored in any user or project namespace.",
            {
                query: z.string().describe("The search query to find relevant memories")
            },
            async ({ query }: { query: string }) => {
                try {
                    console.log(`Searching across all namespaces with query: "${query}"`)

                    // Get all namespaces
                    const result = await env.DB.prepare(
                        `
            SELECT DISTINCT namespace FROM memories
          `
                    ).all()

                    const allResults = []

                    // Search each namespace
                    if (result.results) {
                        for (const row of result.results) {
                            const namespace = (row as any).namespace
                            try {
                                const memories = await searchMemories(query, namespace, env)
                                if (memories.length > 0) {
                                    allResults.push({
                                        namespace,
                                        memories: memories.map((m) => ({
                                            content: m.content,
                                            score: m.score
                                        }))
                                    })
                                }
                            } catch (error) {
                                console.error(`Error searching namespace ${namespace}:`, error)
                            }
                        }
                    }

                    if (allResults.length > 0) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text:
                                        "Found memories across all namespaces:\n" +
                                        allResults
                                            .map(
                                                (result) =>
                                                    `\nIn ${result.namespace}:\n` +
                                                    result.memories
                                                        .map((m) => `${m.content} (score: ${m.score.toFixed(4)})`)
                                                        .join("\n")
                                            )
                                            .join("\n")
                                }
                            ]
                        }
                    }

                    return {
                        content: [{ type: "text", text: "No relevant memories found across any namespace." }]
                    }
                } catch (error) {
                    console.error("Error searching all memories:", error)
                    return {
                        content: [{ type: "text", text: "Failed to search memories: " + String(error) }]
                    }
                }
            }
        )
    }
}
