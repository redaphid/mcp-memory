import { searchMemories, storeMemory, deleteVectorById } from "../utils/vectorize"
import { storeMemoryInD1, deleteMemoryFromD1 } from "../utils/db"
import { storeMemoryWithContext } from "../utils/conversation-context"

export const addToMCPMemoryWithContext = async (args: any, context: any) => {
  const { thingToRemember, conversationContext } = args
  const { namespace, env } = context
  
  if (conversationContext && env) {
    const memoryId = await storeMemoryWithContext(thingToRemember, conversationContext, env, namespace)
    return {
      content: [{
        type: "text" as const,
        text: `Remembered with context in ${namespace}: ${thingToRemember} (ID: ${memoryId})`
      }]
    }
  }
  
  return {
    content: [{
      type: "text" as const,
      text: `Remembered with context in ${namespace}: ${thingToRemember}`
    }]
  }
}

export const addToMCPMemoryTool = {
    name: "addToMCPMemory",
    description: "Store important information in persistent memory",
    inputSchema: {
        type: "object",
        properties: {
            thingToRemember: {
                type: "string",
                description: "The information to remember"
            },
            namespace: {
                type: "string",
                description: "Optional namespace to store the memory in (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
            }
        },
        required: ["thingToRemember"]
    }
}

export const addToMCPMemoryHandler = async (
    { thingToRemember, namespace: customNamespace }: { thingToRemember: string; namespace?: string },
    context: { namespace: string; env: Env }
) => {
    const targetNamespace = customNamespace || context.namespace
    const memoryId = await storeMemory(thingToRemember, targetNamespace, context.env)
    await storeMemoryInD1(thingToRemember, targetNamespace, context.env, memoryId)


    return {
        content: [
            {
                type: "text" as const,
                text: `Remembered in ${targetNamespace}: ${thingToRemember}`
            }
        ]
    }
}

export const searchMCPMemoryTool = {
    name: "searchMCPMemory",
    description: "Search for relevant information in memory",
    inputSchema: {
        type: "object",
        properties: {
            informationToGet: {
                type: "string",
                description: "The information to search for"
            },
            namespace: {
                type: "string",
                description: "Optional namespace to search in (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
            }
        },
        required: ["informationToGet"]
    }
}

export const searchMCPMemoryHandler = async (
    { informationToGet, namespace: searchNamespace }: { informationToGet: string; namespace?: string },
    context: { namespace: string; env: Env }
) => {
    const searchTargetNamespace = searchNamespace || context.namespace
    const memories = await searchMemories(informationToGet, searchTargetNamespace, context.env)


    if (memories.length > 0) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Found memories in ${searchTargetNamespace}:\n` +
                        memories
                            .map((m) => `${m.content} (score: ${m.score.toFixed(4)})`)
                            .join("\n")
                }
            ]
        }
    } else {
        return {
            content: [
                {
                    type: "text" as const,
                    text: `No relevant memories found in ${searchTargetNamespace}.`
                }
            ]
        }
    }
}

export const searchAllMemoriesTool = {
    name: "searchAllMemories",
    description: "Search across all namespaces for relevant memories",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The search query"
            }
        },
        required: ["query"]
    }
}

export const searchAllMemoriesHandler = async (
    { query }: { query: string },
    context: { env: Env }
) => {
    const allResults = []
    
    try {
        // Get all namespaces (excluding deleted memories)
        const result = await context.env.DB.prepare("SELECT DISTINCT namespace FROM memories WHERE deleted_at IS NULL").all()

        if (result.results) {
            // Limit to prevent excessive operations
            const namespaces = result.results.slice(0, 50)
            
            for (const row of namespaces) {
                const namespace = (row as any).namespace
                try {
                    const memories = await searchMemories(query, namespace, context.env)
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
    } catch (error) {
        console.error("Error in searchAllMemoriesHandler:", error)
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Error searching across namespaces: ${error}`
                }
            ]
        }
    }

    if (allResults.length > 0) {
        return {
            content: [
                {
                    type: "text" as const,
                    text: "Found memories across all namespaces:\n" +
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
    } else {
        return {
            content: [
                {
                    type: "text" as const,
                    text: "No relevant memories found across any namespace."
                }
            ]
        }
    }
}

export const deleteMemoryTool = {
    name: "deleteMemory",
    description: "Delete a specific memory by its ID from the current namespace",
    inputSchema: {
        type: "object",
        properties: {
            memoryId: {
                type: "string",
                description: "The ID of the memory to delete"
            },
            namespace: {
                type: "string",
                description: "Optional namespace to delete from (e.g., 'user:alice', 'project:frontend'). If not provided, uses the current server namespace."
            }
        },
        required: ["memoryId"]
    }
}

export const deleteMemoryHandler = async (
    { memoryId, namespace: deleteNamespace }: { memoryId: string; namespace?: string },
    context: { namespace: string; env: Env }
) => {
    const deleteTargetNamespace = deleteNamespace || context.namespace
    
    try {
        // Delete from both D1 and Vectorize
        await deleteMemoryFromD1(memoryId, deleteTargetNamespace, context.env)
        await deleteVectorById(memoryId, deleteTargetNamespace, context.env)
        
        
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Memory ${memoryId} deleted from ${deleteTargetNamespace}`
                }
            ]
        }
    } catch (error) {
        console.error("Error in deleteMemory:", error)
        throw new Error(`Failed to delete memory: ${error}`)
    }
}

export const deleteNamespaceTool = {
    name: "deleteNamespace",
    description: "Delete an entire namespace and all its memories. Use with caution as this action cannot be undone.",
    inputSchema: {
        type: "object",
        properties: {
            namespace: {
                type: "string",
                description: "The namespace to delete (e.g., 'user:alice', 'project:frontend')"
            }
        },
        required: ["namespace"]
    }
}

export const deleteNamespaceHandler = async (
    { namespace: namespaceToDelete }: { namespace: string },
    context: { env: Env }
) => {
    try {
        // Get all memories in the namespace first (excluding already deleted)
        const memories = await context.env.DB.prepare(
            "SELECT id FROM memories WHERE namespace = ? AND deleted_at IS NULL"
        ).bind(namespaceToDelete).all()
        
        // Delete all vectors for this namespace
        if (memories.results && memories.results.length > 0) {
            for (const row of memories.results) {
                const memoryId = (row as any).id
                try {
                    await deleteVectorById(memoryId, namespaceToDelete, context.env)
                } catch (error) {
                    console.error(`Error deleting vector ${memoryId}:`, error)
                }
            }
        }
        
        // Soft delete all memories from D1
        const deletedAt = new Date().toISOString()
        const deleteResult = await context.env.DB.prepare(
            "UPDATE memories SET deleted_at = ? WHERE namespace = ? AND deleted_at IS NULL"
        ).bind(deletedAt, namespaceToDelete).run()
        
        const deletedCount = deleteResult.meta?.changes || 0
        
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Namespace ${namespaceToDelete} deleted with ${deletedCount} memories`
                }
            ]
        }
    } catch (error) {
        console.error("Error in deleteNamespace:", error)
        throw new Error(`Failed to delete namespace: ${error}`)
    }
}