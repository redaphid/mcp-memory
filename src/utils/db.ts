import { v4 as uuidv4 } from "uuid"

export async function initializeDatabase(env: Env) {
    // Create memories table with essential columns only
    await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            namespace TEXT NOT NULL DEFAULT 'user:unknown',
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT DEFAULT NULL
        )
    `)

    // Migration: add namespace column if missing (for existing databases)
    try {
        const result = await env.DB.prepare("PRAGMA table_info(memories)").all()
        const columns = result.results as Array<{ name: string }>

        if (!columns.some(col => col.name === "namespace")) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN namespace TEXT DEFAULT 'user:unknown'")
        }
        if (!columns.some(col => col.name === "deleted_at")) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN deleted_at TEXT DEFAULT NULL")
        }
    } catch (e) {
        console.error("Error checking/adding columns:", e)
    }

    // Create indexes for performance
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_namespace ON memories(namespace)")
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_deleted_at ON memories(deleted_at)")

    // Create system metadata table for tracking sync state
    await env.DB.exec("CREATE TABLE IF NOT EXISTS system_metadata (key TEXT PRIMARY KEY, value TEXT)")

    // Create vector sync tracking table
    await env.DB.exec("CREATE TABLE IF NOT EXISTS vector_sync (memory_id TEXT PRIMARY KEY, synced_at TEXT)")
}

export async function storeMemoryInD1(content: string, namespace: string, env: Env, memoryId = uuidv4()) {
    await env.DB.prepare("INSERT INTO memories (id, namespace, content) VALUES (?, ?, ?)")
        .bind(memoryId, namespace, content)
        .run()
    return memoryId
}

export async function deleteMemoryFromD1(memoryId: string, namespace: string, env: Env) {
    const deletedAt = new Date().toISOString()
    await env.DB.prepare("UPDATE memories SET deleted_at = ? WHERE id = ? AND namespace = ? AND deleted_at IS NULL")
        .bind(deletedAt, memoryId, namespace)
        .run()
}

export async function updateMemoryInD1(memoryId: string, namespace: string, newContent: string, env: Env) {
    const result = await env.DB.prepare("UPDATE memories SET content = ? WHERE id = ? AND namespace = ? AND deleted_at IS NULL")
        .bind(newContent, memoryId, namespace)
        .run()

    if (!result.meta || result.meta.changes === 0) {
        throw new Error(`Memory ${memoryId} not found in namespace ${namespace}`)
    }
}
