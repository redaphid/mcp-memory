import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { McpAgent } from "agents/mcp"
import { z } from "zod"
import { storeMemoryInD1, deleteMemoryFromD1 } from "./utils/db"
import { searchMemories, storeMemory, deleteVectorById } from "./utils/vectorize"
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
                    const memoryId = await storeMemory(thingToRemember, targetNamespace, env)
                    await storeMemoryInD1(thingToRemember, targetNamespace, env, memoryId)

                    console.log(
                        `Memory stored successfully in namespace '${targetNamespace}' with ID: ${memoryId}, content: "${thingToRemember}"`
                    )

                    return {
                        content: [{ type: "text", text: `Remembered in ${targetNamespace}: ${thingToRemember}` }]
                    }
                } catch (error) {
                    console.error("Error in addToMCPMemory:", error)
                    return {
                        content: [{ type: "text", text: `Failed to remember: ${error}` }]
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

                    const memories = await searchMemories(informationToGet, targetNamespace, env)
                    console.log(`Search returned ${memories.length} matches`)

                    if (memories.length === 0)
                        return { content: [{ type: "text", text: `No relevant memories found in ${targetNamespace}.` }] }

                    return {
                        content: [{
                            type: "text",
                            text: `Found memories in ${targetNamespace}:\n` +
                                  memories.map(m => `${m.content} (score: ${m.score.toFixed(4)})`).join("\n")
                        }]
                    }
                } catch (error) {
                    console.error("Error in searchMCPMemory:", error)
                    return {
                        content: [{ type: "text", text: `Search failed: ${error}` }]
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
                console.log(`Searching across all namespaces with query: "${query}"`)

                const result = await env.DB.prepare(`SELECT DISTINCT namespace FROM memories WHERE deleted_at IS NULL`).all()
                const allResults = []

                if (result.results) {
                    for (const row of result.results) {
                        const namespace = (row as any).namespace
                        try {
                            const memories = await searchMemories(query, namespace, env)
                            if (memories.length > 0) {
                                allResults.push({
                                    namespace,
                                    memories: memories.map(m => ({ content: m.content, score: m.score }))
                                })
                            }
                        } catch (error) {
                            console.error(`Error searching namespace ${namespace}:`, error)
                        }
                    }
                }

                if (allResults.length === 0)
                    return { content: [{ type: "text", text: "No relevant memories found across any namespace." }] }

                return {
                    content: [{
                        type: "text",
                        text: "Found memories across all namespaces:\n" +
                              allResults.map(result =>
                                  `\nIn ${result.namespace}:\n` +
                                  result.memories.map(m => `${m.content} (score: ${m.score.toFixed(4)})`).join("\n")
                              ).join("\n")
                    }]
                }
            }
        )

        // Add delete memory tool
        this.server.tool(
            "deleteMemory",
            "This tool deletes a specific memory by its ID from the current namespace. Use when you need to remove outdated or incorrect information.",
            {
                memoryId: z.string().describe("The ID of the memory to delete"),
                namespace: z
                    .string()
                    .optional()
                    .describe(
                        "Optional namespace to delete from (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
                    )
            },
            async ({ memoryId, namespace }: { memoryId: string; namespace?: string }) => {
                try {
                    const targetNamespace = namespace || this.props.namespace
                    
                    // Delete from both D1 and Vectorize
                    await deleteMemoryFromD1(memoryId, targetNamespace, env)
                    await deleteVectorById(memoryId, targetNamespace, env)
                    
                    console.log(`Memory ${memoryId} deleted from namespace '${targetNamespace}'`)
                    
                    return {
                        content: [{ type: "text", text: `Memory ${memoryId} deleted from ${targetNamespace}` }]
                    }
                } catch (error) {
                    console.error("Error in deleteMemory:", error)
                    return {
                        content: [{ type: "text", text: `Failed to delete memory: ${error}` }]
                    }
                }
            }
        )

        // Add delete namespace tool
        this.server.tool(
            "deleteNamespace",
            "This tool deletes an entire namespace and all its memories. Use with caution as this action cannot be undone.",
            {
                namespace: z.string().describe("The namespace to delete (e.g., 'user:alice', 'project:frontend')")
            },
            async ({ namespace }: { namespace: string }) => {
                try {
                    // Get all memories in the namespace first (excluding already deleted)
                    const memories = await env.DB.prepare(
                        "SELECT id FROM memories WHERE namespace = ? AND deleted_at IS NULL"
                    ).bind(namespace).all()
                    
                    // Delete all vectors for this namespace
                    if (memories.results && memories.results.length > 0) {
                        for (const row of memories.results) {
                            const memoryId = (row as any).id
                            try {
                                await deleteVectorById(memoryId, namespace, env)
                            } catch (error) {
                                console.error(`Error deleting vector ${memoryId}:`, error)
                            }
                        }
                    }
                    
                    // Soft delete all memories from D1
                    const deletedAt = new Date().toISOString()
                    const deleteResult = await env.DB.prepare(
                        "UPDATE memories SET deleted_at = ? WHERE namespace = ? AND deleted_at IS NULL"
                    ).bind(deletedAt, namespace).run()
                    
                    const deletedCount = deleteResult.meta?.changes || 0
                    console.log(`Deleted ${deletedCount} memories from namespace '${namespace}'`)
                    
                    return {
                        content: [{ type: "text", text: `Namespace ${namespace} deleted with ${deletedCount} memories` }]
                    }
                } catch (error) {
                    console.error("Error in deleteNamespace:", error)
                    return {
                        content: [{ type: "text", text: `Failed to delete namespace: ${error}` }]
                    }
                }
            }
        )
    }
}
