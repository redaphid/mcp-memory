import { Hono } from "hono"
import { MemoryMCP } from "./mcp"
import { initializeDatabase } from "./utils/db"
import { searchMemories, storeMemory } from "./utils/vectorize"

const app = new Hono<{ Bindings: Env }>()

// Initialize database once
let dbInitialized = false

app.use("*", async (c, next) => {
    if (!dbInitialized) {
        try {
            await initializeDatabase(c.env)
            dbInitialized = true
        } catch (e) {
            console.error("Failed to initialize D1 database:", e)
        }
    }
    await next()
})

// Serve static index.html
app.get("/", async (c) => c.env.ASSETS.fetch(c.req.raw))

// Health check endpoint
app.get("/health", async (c) => {
    const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: { database: false, vectorize: false }
    }

    try {
        const dbCheck = await c.env.DB.prepare("SELECT 1 as test").first()
        health.checks.database = dbCheck?.test === 1

        try {
            await searchMemories("health check", "system:health", c.env)
            health.checks.vectorize = true
        } catch {
            health.checks.vectorize = false
        }

        if (!health.checks.database || !health.checks.vectorize) {
            health.status = "unhealthy"
            return c.json(health, 503)
        }

        return c.json(health)
    } catch (error) {
        health.status = "error"
        return c.json({ ...health, error: error instanceof Error ? error.message : "Unknown error" }, 503)
    }
})

// Create streaming HTTP handlers for MCP
const userMcpHandler = MemoryMCP.serve("/user/:userId/mcp", { binding: "MCP_OBJECT" })
const projectMcpHandler = MemoryMCP.serve("/project/:projectId/mcp", { binding: "MCP_OBJECT" })
const allMcpHandler = MemoryMCP.serve("/all/mcp", { binding: "MCP_OBJECT" })

// Streaming HTTP MCP endpoints
app.all("/user/:userId/mcp", (c) => userMcpHandler.fetch(c.req.raw, c.env, c.executionCtx as any))
app.all("/project/:projectId/mcp", (c) => projectMcpHandler.fetch(c.req.raw, c.env, c.executionCtx as any))
app.all("/all/mcp", (c) => allMcpHandler.fetch(c.req.raw, c.env, c.executionCtx as any))

// Serve admin page
app.get("/admin", async (c) => {
    const html = await c.env.ASSETS.fetch(new Request("https://placeholder/admin.html")).then(r => r.text())
    return c.html(html)
})

// Fallback to static assets
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
export { MemoryMCP }

// Scheduled cron job for incremental vector backups
export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env) => {
    try {
        const lastBackupResult = await env.DB.prepare(
            "SELECT value FROM system_metadata WHERE key = 'last_vector_backup'"
        ).first<{ value: string }>()

        const lastBackup = lastBackupResult?.value || "2000-01-01T00:00:00Z"
        const currentTime = new Date().toISOString()

        // Get memories not yet synced to vectorize
        const unsynced = await env.DB.prepare(
            `SELECT m.id, m.namespace, m.content
             FROM memories m
             LEFT JOIN vector_sync v ON m.id = v.memory_id
             WHERE m.created_at > ? AND m.deleted_at IS NULL AND v.memory_id IS NULL
             ORDER BY m.created_at ASC
             LIMIT 100`
        ).bind(lastBackup).all()

        if (unsynced.results && unsynced.results.length > 0) {
            for (const row of unsynced.results) {
                const memory = row as { id: string; namespace: string; content: string }
                try {
                    await storeMemory(memory.content, memory.namespace, env)
                    await env.DB.prepare(
                        "INSERT INTO vector_sync (memory_id, synced_at) VALUES (?, ?)"
                    ).bind(memory.id, currentTime).run()
                } catch (error) {
                    console.error(`Error syncing memory ${memory.id}:`, error)
                }
            }
        }

        await env.DB.prepare(
            `INSERT INTO system_metadata (key, value) VALUES ('last_vector_backup', ?)
             ON CONFLICT(key) DO UPDATE SET value = ?`
        ).bind(currentTime, currentTime).run()
    } catch (error) {
        console.error("Cron job error:", error)
    }
}
