import { v4 as uuidv4 } from "uuid"

export async function initializeDatabase(env: Env) {
    await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, content TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    )

    try {
        const result = await env.DB.prepare("PRAGMA table_info(memories)").all()
        const columns = result.results as Array<{ name: string }>
        const hasNamespace = columns.some((col) => col.name === "namespace")
        const hasDeletedAt = columns.some((col) => col.name === "deleted_at")
        const hasConversationContext = columns.some((col) => col.name === "conversation_context")
        const hasContextSummary = columns.some((col) => col.name === "context_summary")
        const hasTags = columns.some((col) => col.name === "tags")

        if (!hasNamespace) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN namespace TEXT DEFAULT 'user:unknown'")
        }

        if (!hasDeletedAt) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN deleted_at TEXT DEFAULT NULL")
        }

        if (!hasConversationContext) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN conversation_context TEXT")
        }

        if (!hasContextSummary) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN context_summary TEXT")
        }

        if (!hasTags) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN tags TEXT")
        }
    } catch (e) {
        console.error("Error checking/adding columns:", e)
    }

    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_namespace ON memories(namespace)")
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_deleted_at ON memories(deleted_at)")
    
    // Create system metadata table for tracking sync state
    await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS system_metadata (key TEXT PRIMARY KEY, value TEXT)"
    )
    
    // Create vector sync tracking table
    await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS vector_sync (memory_id TEXT PRIMARY KEY, synced_at TEXT)"
    )
}

export async function storeMemoryInD1(
    content: string,
    namespace: string,
    env: Env,
    memoryId = uuidv4()
) {
    const userId = namespace.startsWith("user:") ? namespace.substring(5) : uuidv4()
    
    const stmt = env.DB.prepare("INSERT INTO memories (id, userId, namespace, content) VALUES (?, ?, ?, ?)")
    await stmt.bind(memoryId, userId, namespace, content).run()
    
    return memoryId
}

export async function getAllMemoriesFromD1(namespace: string, env: Env) {
    const result = await env.DB.prepare(
        "SELECT id, content FROM memories WHERE namespace = ? AND deleted_at IS NULL ORDER BY created_at DESC"
    )
        .bind(namespace)
        .all()

    return result.results as Array<{ id: string; content: string }>
}

export async function deleteMemoryFromD1(memoryId: string, namespace: string, env: Env) {
    const deletedAt = new Date().toISOString()
    await env.DB.prepare("UPDATE memories SET deleted_at = ? WHERE id = ? AND namespace = ? AND deleted_at IS NULL")
        .bind(deletedAt, memoryId, namespace)
        .run()
}

export async function updateMemoryInD1(
    memoryId: string,
    namespace: string,
    newContent: string,
    env: Env
) {
    const stmt = env.DB.prepare("UPDATE memories SET content = ? WHERE id = ? AND namespace = ? AND deleted_at IS NULL")
    const result = await stmt.bind(newContent, memoryId, namespace).run()

    if (!result.meta || result.meta.changes === 0)
        throw new Error(`Memory with ID ${memoryId} not found in namespace ${namespace} or content unchanged (may have been deleted).`)

}

export async function getDeletedMemoriesFromD1(namespace: string, env: Env) {
    return []
}
