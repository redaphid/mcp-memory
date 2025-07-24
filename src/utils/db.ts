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
        const hasSupersededBy = columns.some((col) => col.name === "superseded_by")
        const hasConsolidates = columns.some((col) => col.name === "consolidates")
        const hasConsolidationNotes = columns.some((col) => col.name === "consolidation_notes")
        const hasConsolidationDate = columns.some((col) => col.name === "consolidation_date")

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

        if (!hasSupersededBy) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN superseded_by TEXT DEFAULT NULL")
        }

        if (!hasConsolidates) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN consolidates TEXT DEFAULT NULL")
        }

        if (!hasConsolidationNotes) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN consolidation_notes TEXT DEFAULT NULL")
        }

        if (!hasConsolidationDate) {
            await env.DB.exec("ALTER TABLE memories ADD COLUMN consolidation_date TEXT DEFAULT NULL")
        }
    } catch (e) {
        console.error("Error checking/adding columns:", e)
    }

    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_namespace ON memories(namespace)")
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_deleted_at ON memories(deleted_at)")
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_superseded_by ON memories(superseded_by)")
    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_consolidation_date ON memories(consolidation_date)")
    
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

export async function markMemoryAsSuperseded(
    memoryId: string,
    supersededBy: string,
    namespace: string,
    env: Env
) {
    const stmt = env.DB.prepare("UPDATE memories SET superseded_by = ? WHERE id = ? AND namespace = ? AND deleted_at IS NULL")
    const result = await stmt.bind(supersededBy, memoryId, namespace).run()
    
    if (!result.meta || result.meta.changes === 0) {
        throw new Error(`Memory with ID ${memoryId} not found in namespace ${namespace}`)
    }
}

export async function createConsolidatedMemory(
    content: string,
    namespace: string,
    consolidatedMemoryIds: string[],
    consolidationNotes: string,
    env: Env,
    memoryId = uuidv4()
) {
    const consolidationDate = new Date().toISOString()
    const consolidatesJson = JSON.stringify(consolidatedMemoryIds)
    
    const stmt = env.DB.prepare(
        "INSERT INTO memories (id, content, namespace, consolidates, consolidation_notes, consolidation_date) VALUES (?, ?, ?, ?, ?, ?)"
    )
    await stmt.bind(memoryId, content, namespace, consolidatesJson, consolidationNotes, consolidationDate).run()
    
    return memoryId
}

export async function getMemoryMetadata(memoryIds: string[], namespace: string, env: Env) {
    if (memoryIds.length === 0) return []
    
    const placeholders = memoryIds.map(() => '?').join(',')
    const query = `SELECT id, content, created_at, superseded_by, consolidates, consolidation_notes, consolidation_date 
                   FROM memories 
                   WHERE id IN (${placeholders}) AND namespace = ? AND deleted_at IS NULL`
    
    const stmt = env.DB.prepare(query)
    const result = await stmt.bind(...memoryIds, namespace).all()
    
    return result.results as Array<{
        id: string
        content: string
        created_at: string
        superseded_by: string | null
        consolidates: string | null
        consolidation_notes: string | null
        consolidation_date: string | null
    }>
}

export async function bulkDeleteMemories(memoryIds: string[], namespace: string, env: Env) {
    if (memoryIds.length === 0) return { deleted: 0, failed: [] }
    
    const deletedAt = new Date().toISOString()
    const failed: string[] = []
    let deleted = 0
    
    for (const memoryId of memoryIds) {
        try {
            const stmt = env.DB.prepare("UPDATE memories SET deleted_at = ? WHERE id = ? AND namespace = ? AND deleted_at IS NULL")
            const result = await stmt.bind(deletedAt, memoryId, namespace).run()
            
            if (result.meta && result.meta.changes > 0) {
                deleted++
            } else {
                failed.push(memoryId)
            }
        } catch (error) {
            console.error(`Failed to delete memory ${memoryId}:`, error)
            failed.push(memoryId)
        }
    }
    
    return { deleted, failed }
}
