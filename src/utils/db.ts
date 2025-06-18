import { v4 as uuidv4 } from "uuid"

export async function initializeDatabase(env: Env) {
    await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, content TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    )
    console.log("Checked/Created memories table in D1.")

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

    await env.DB.exec("CREATE INDEX IF NOT EXISTS idx_namespace ON memories(namespace)")
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
    console.log(`Memory stored in D1 with ID: ${memoryId} in namespace: ${namespace}`)
    
    return memoryId
}

export async function getAllMemoriesFromD1(namespace: string, env: Env) {
    const result = await env.DB.prepare(
        "SELECT id, content FROM memories WHERE namespace = ? ORDER BY created_at DESC"
    )
        .bind(namespace)
        .all()

    return result.results as Array<{ id: string; content: string }>
}

export async function deleteMemoryFromD1(memoryId: string, namespace: string, env: Env) {
    await env.DB.prepare("DELETE FROM memories WHERE id = ? AND namespace = ?").bind(memoryId, namespace).run()
    console.log(`Memory ${memoryId} deleted from D1 in namespace: ${namespace}`)
}

export async function updateMemoryInD1(
    memoryId: string,
    namespace: string,
    newContent: string,
    env: Env
) {
    const stmt = env.DB.prepare("UPDATE memories SET content = ? WHERE id = ? AND namespace = ?")
    const result = await stmt.bind(newContent, memoryId, namespace).run()

    if (!result.meta || result.meta.changes === 0)
        throw new Error(`Memory with ID ${memoryId} not found in namespace ${namespace} or content unchanged.`)

    console.log(`Memory ${memoryId} updated in D1 in namespace: ${namespace}`)
}
