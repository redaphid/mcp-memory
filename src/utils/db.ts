import { v4 as uuidv4 } from "uuid"

/**
 * Ensures the memories table exists in D1
 */
export async function initializeDatabase(env: Env): Promise<void> {
    try {
        // First, create the table if it doesn't exist
        await env.DB.exec(
            "CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, content TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
        )
        console.log("Checked/Created memories table in D1.")

        // Check if namespace column exists, if not add it
        try {
            const result = await env.DB.prepare("PRAGMA table_info(memories)").all()
            const columns = result.results as Array<{ name: string }>
            const hasNamespace = columns.some((col) => col.name === "namespace")

            if (!hasNamespace) {
                console.log("Adding namespace column to memories table...")
                await env.DB.exec("ALTER TABLE memories ADD COLUMN namespace TEXT DEFAULT 'user:unknown'")
                console.log("Added namespace column to memories table.")
            }
        } catch (e) {
            console.error("Error checking/adding namespace column:", e)
        }

        // Create index for namespace queries
        await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_namespace ON memories(namespace)")
    } catch (e) {
        console.error("Failed to create memories table in D1:", e)
        throw e
    }
}

/**
 * Stores a memory in D1 database
 * @param content Memory content to store
 * @param namespace Namespace to associate with memory (e.g., "user:alice", "project:frontend")
 * @param env Environment object containing the DB binding
 * @param memoryId Optional ID, will generate UUID if not provided
 * @returns Memory ID
 */
export async function storeMemoryInD1(
    content: string,
    namespace: string,
    env: Env,
    memoryId: string = uuidv4()
): Promise<string> {
    try {
        // Extract userId from namespace or generate one for non-user namespaces
        let userId: string
        if (namespace.startsWith("user:")) {
            userId = namespace.substring(5) // Remove "user:" prefix
        } else {
            userId = uuidv4() // Generate a UUID for project/all namespaces
        }

        const stmt = env.DB.prepare("INSERT INTO memories (id, userId, namespace, content) VALUES (?, ?, ?, ?)")

        await stmt.bind(memoryId, userId, namespace, content).run()
        console.log(`Memory stored in D1 with ID: ${memoryId} in namespace: ${namespace}`)

        return memoryId
    } catch (error) {
        console.error("Error storing memory in D1:", error)
        throw error
    }
}

/**
 * Retrieves all memories for a namespace from D1
 * @param namespace Namespace to retrieve memories for (e.g., "user:alice", "project:frontend")
 * @param env Environment object containing the DB binding
 * @returns Array of memory objects
 */
export async function getAllMemoriesFromD1(
    namespace: string,
    env: Env
): Promise<Array<{ id: string; content: string }>> {
    try {
        const result = await env.DB.prepare(
            "SELECT id, content FROM memories WHERE namespace = ? ORDER BY created_at DESC"
        )
            .bind(namespace)
            .all()

        return result.results as Array<{ id: string; content: string }>
    } catch (error) {
        console.error("Error retrieving memories from D1:", error)
        throw error
    }
}

/**
 * Deletes a memory from D1
 * @param memoryId ID of memory to delete
 * @param namespace Namespace associated with memory (e.g., "user:alice", "project:frontend")
 * @param env Environment object containing the DB binding
 */
export async function deleteMemoryFromD1(memoryId: string, namespace: string, env: Env): Promise<void> {
    try {
        await env.DB.prepare("DELETE FROM memories WHERE id = ? AND namespace = ?").bind(memoryId, namespace).run()

        console.log(`Memory ${memoryId} deleted from D1 in namespace: ${namespace}`)
    } catch (error) {
        console.error("Error deleting memory from D1:", error)
        throw error
    }
}

/**
 * Updates the content of a memory in D1
 * @param memoryId ID of the memory to update
 * @param namespace Namespace associated with the memory (e.g., "user:alice", "project:frontend")
 * @param newContent The new content for the memory
 * @param env Environment object containing the DB binding
 */
export async function updateMemoryInD1(
    memoryId: string,
    namespace: string,
    newContent: string,
    env: Env
): Promise<void> {
    try {
        const stmt = env.DB.prepare("UPDATE memories SET content = ? WHERE id = ? AND namespace = ?")
        const result = await stmt.bind(newContent, memoryId, namespace).run()

        // Check the meta property for changes
        if (!result.meta || result.meta.changes === 0) {
            throw new Error(`Memory with ID ${memoryId} not found in namespace ${namespace} or content unchanged.`)
        }

        console.log(`Memory ${memoryId} updated in D1 in namespace: ${namespace}`)
    } catch (error) {
        console.error("Error updating memory in D1:", error)
        throw error
    }
}
