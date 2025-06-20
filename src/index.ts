import { Hono } from "hono"
import { MyMCP } from "./mcp"
import { MCPSSEServer } from "./mcp-sse"
import {
    getAllMemoriesFromD1,
    initializeDatabase,
    deleteMemoryFromD1,
    updateMemoryInD1,
    storeMemoryInD1
} from "./utils/db"
import { deleteVectorById, updateMemoryVector, searchMemories, storeMemory } from "./utils/vectorize"

const app = new Hono<{
    Bindings: Env
}>()

// Initialize database once
let dbInitialized = false

// Middleware for one-time database initialization
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

// index.html
app.get("/", async (c) => await c.env.ASSETS.fetch(c.req.raw))

// Health check endpoint
app.get("/health", async (c) => {
    const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: {
            database: false,
            vectorize: false,
            lastSync: null as string | null
        }
    }
    
    try {
        // Check D1 database
        const dbCheck = await c.env.DB.prepare("SELECT 1 as test").first()
        health.checks.database = dbCheck?.test === 1
        
        // Check last sync time
        const lastSync = await c.env.DB.prepare(
            "SELECT value FROM system_metadata WHERE key = 'last_vector_backup'"
        ).first<{ value: string }>()
        health.checks.lastSync = lastSync?.value || null
        
        // Check Vectorize (try a simple search)
        try {
            await searchMemories("health check", "system:health", c.env)
            health.checks.vectorize = true
        } catch {
            health.checks.vectorize = false
        }
        
        // Determine overall health
        if (!health.checks.database || !health.checks.vectorize) {
            health.status = "unhealthy"
            return c.json(health, 503)
        }
        
        return c.json(health)
    } catch (error) {
        health.status = "error"
        return c.json({
            ...health,
            error: error instanceof Error ? error.message : "Unknown error"
        }, 503)
    }
})

// Test endpoint to create sample data
app.post("/api/test-data", async (c) => {
    try {
        // Create some test memories
        const testMemories = [
            { content: "User Alice loves JavaScript and React", namespace: "user:alice" },
            { content: "User Bob prefers Python and Django", namespace: "user:bob" },
            { content: "Project frontend uses React and TypeScript", namespace: "project:frontend" },
            { content: "Authentication system implemented with JWT", namespace: "user:alice" },
            { content: "Database migration completed successfully", namespace: "project:backend" }
        ]

        for (const memory of testMemories) {
            // Store in D1
            const memoryId = await storeMemoryInD1(memory.content, memory.namespace, c.env)

            // Store in Vectorize
            try {
                await storeMemory(memory.content, memory.namespace, c.env)
            } catch (vectorError) {
                console.error("Failed to store in Vectorize:", vectorError)
            }
        }

        return c.json({ success: true, message: "Test data created successfully" })
    } catch (error) {
        console.error("Error creating test data:", error)
        return c.json(
            {
                success: false,
                error: "Failed to create test data",
                details: error instanceof Error ? error.message : String(error)
            },
            500
        )
    }
})

// Get available namespaces (users and projects)
app.get("/api/namespaces", async (c) => {
    try {
        // Get distinct namespaces from the database
        const result = await c.env.DB.prepare(
            `
          SELECT DISTINCT namespace FROM memories
        `
        ).all()


        const namespaces = {
            users: [] as string[],
            projects: [] as string[],
            all: false
        }

        if (result.results) {
            for (const row of result.results) {
                const namespace = (row as any).namespace
                if (namespace.startsWith("user:")) {
                    namespaces.users.push(namespace.substring(5))
                } else if (namespace.startsWith("project:")) {
                    namespaces.projects.push(namespace.substring(8))
                } else if (namespace === "all") {
                    namespaces.all = true
                }
            }
        } else {
        }

        return c.json({ success: true, namespaces })
    } catch (error) {
        console.error("Error getting namespaces:", error)
        return c.json(
            {
                success: false,
                error: "Failed to retrieve namespaces",
                details: error instanceof Error ? error.message : String(error)
            },
            500
        )
    }
})

// Search across multiple namespaces
app.post("/api/search", async (c) => {
    try {
        const body = await c.req.json()
        const { query, namespaces = [], dateFrom, dateTo } = body

        if (!query) {
            return c.json({ error: "Missing query parameter" }, 400)
        }

        const results = []

        // Search each namespace
        for (const namespace of namespaces) {
            try {
                const memories = await searchMemories(query, namespace, c.env)

                // If date filtering is requested, we'll need to fetch from D1 to get dates
                if (dateFrom || dateTo) {
                    const dbMemories = await c.env.DB.prepare(
                        `
            SELECT id, created_at FROM memories
            WHERE namespace = ?
            ${dateFrom ? "AND created_at >= ?" : ""}
            ${dateTo ? "AND created_at <= ?" : ""}
          `
                    )
                        .bind(namespace, ...(dateFrom ? [dateFrom] : []), ...(dateTo ? [dateTo] : []))
                        .all()

                    const validIds = new Set((dbMemories.results || []).map((m: any) => m.id))

                    results.push({
                        namespace,
                        memories: memories.filter((m) => validIds.has(m.id))
                    })
                } else {
                    results.push({ namespace, memories })
                }
            } catch (error) {
                console.error(`Error searching namespace ${namespace}:`, error)
            }
        }

        return c.json({
            success: true,
            query,
            results
        })
    } catch (error) {
        console.error("Error in multi-namespace search:", error)
        return c.json({ success: false, error: "Failed to search memories" }, 500)
    }
})

// Search across all namespaces (read-only)
app.post("/api/search-all", async (c) => {
    try {
        const body = await c.req.json()
        const { query, dateFrom, dateTo } = body

        if (!query) {
            return c.json({ error: "Missing query parameter" }, 400)
        }

        // Get all namespaces
        const result = await c.env.DB.prepare(
            `
      SELECT DISTINCT namespace FROM memories
    `
        ).all()

        const results = []

        // Search each namespace
        if (result.results) {
            for (const row of result.results) {
                const namespace = (row as any).namespace
                try {
                    const memories = await searchMemories(query, namespace, c.env)

                    // If date filtering is requested, we'll need to fetch from D1 to get dates
                    if (dateFrom || dateTo) {
                        const dbMemories = await c.env.DB.prepare(
                            `
              SELECT id, created_at FROM memories
              WHERE namespace = ?
              ${dateFrom ? "AND created_at >= ?" : ""}
              ${dateTo ? "AND created_at <= ?" : ""}
            `
                        )
                            .bind(namespace, ...(dateFrom ? [dateFrom] : []), ...(dateTo ? [dateTo] : []))
                            .all()

                        const validIds = new Set((dbMemories.results || []).map((m: any) => m.id))

                        results.push({
                            namespace,
                            memories: memories.filter((m) => validIds.has(m.id))
                        })
                    } else {
                        results.push({ namespace, memories })
                    }
                } catch (error) {
                    console.error(`Error searching namespace ${namespace}:`, error)
                }
            }
        }

        return c.json({
            success: true,
            query,
            results
        })
    } catch (error) {
        console.error("Error in all-namespace search:", error)
        return c.json({ success: false, error: "Failed to search memories" }, 500)
    }
})

// Get all memories for a namespace with pagination
app.get("/:namespaceType/:namespaceId/memories", async (c) => {
    const namespaceType = c.req.param("namespaceType")
    const namespaceId = c.req.param("namespaceId")
    const namespace = `${namespaceType}:${namespaceId}`

    // Pagination parameters
    const page = parseInt(c.req.query("page") || "1")
    const limit = parseInt(c.req.query("limit") || "20")
    const offset = (page - 1) * limit
    const sortBy = c.req.query("sortBy") || "date"

    try {
        // Get total count
        const countResult = await c.env.DB.prepare("SELECT COUNT(*) as total FROM memories WHERE namespace = ? AND deleted_at IS NULL")
            .bind(namespace)
            .first()

        const total = (countResult as any)?.total || 0

        // Get paginated results
        const orderBy = sortBy === "date" ? "created_at DESC" : "created_at DESC"
        const memories = await c.env.DB.prepare(
            `SELECT id, content, created_at FROM memories
       WHERE namespace = ? AND deleted_at IS NULL
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
        )
            .bind(namespace, limit, offset)
            .all()

        return c.json({
            success: true,
            memories: memories.results,
            namespace,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error(`Error retrieving memories for namespace ${namespace}:`, error)
        return c.json({ success: false, error: "Failed to retrieve memories" }, 500)
    }
})

// Delete a memory for a namespace
app.delete("/:namespaceType/:namespaceId/memories/:memoryId", async (c) => {
    const namespaceType = c.req.param("namespaceType")
    const namespaceId = c.req.param("namespaceId")
    const memoryId = c.req.param("memoryId")
    const namespace = `${namespaceType}:${namespaceId}`

    try {
        // 1. Delete from D1
        await deleteMemoryFromD1(memoryId, namespace, c.env)

        // 2. Delete from Vectorize index
        try {
            await deleteVectorById(memoryId, namespace, c.env)
        } catch (vectorError) {
            console.error(`Failed to delete vector ${memoryId} for namespace ${namespace} from Vectorize:`, vectorError)
        }

        return c.json({ success: true })
    } catch (error) {
        console.error(`Error deleting memory ${memoryId} (D1 primary) for namespace ${namespace}:`, error)
        return c.json({ success: false, error: "Failed to delete memory" }, 500)
    }
})

// Update a specific memory for a namespace
app.put("/:namespaceType/:namespaceId/memories/:memoryId", async (c) => {
    const namespaceType = c.req.param("namespaceType")
    const namespaceId = c.req.param("namespaceId")
    const memoryId = c.req.param("memoryId")
    const namespace = `${namespaceType}:${namespaceId}`
    let updatedContent: string

    try {
        // Get updated content from request body
        const body = await c.req.json()
        if (!body || typeof body.content !== "string" || body.content.trim() === "") {
            return c.json({ success: false, error: "Invalid or missing content in request body" }, 400)
        }
        updatedContent = body.content.trim()
    } catch (e) {
        console.error("Failed to parse request body:", e)
        return c.json({ success: false, error: "Failed to parse request body" }, 400)
    }

    try {
        // 1. Update in D1
        await updateMemoryInD1(memoryId, namespace, updatedContent, c.env)

        // 2. Update vector in Vectorize
        try {
            await updateMemoryVector(memoryId, updatedContent, namespace, c.env)
        } catch (vectorError) {
            console.error(`Failed to update vector ${memoryId} for namespace ${namespace} in Vectorize:`, vectorError)
        }

        return c.json({ success: true })
    } catch (error: any) {
        console.error(`Error updating memory ${memoryId} for namespace ${namespace}:`, error)
        const errorMessage = error.message || "Failed to update memory"
        if (errorMessage.includes("not found")) {
            return c.json({ success: false, error: errorMessage }, 404)
        }
        return c.json({ success: false, error: errorMessage }, 500)
    }
})

// Simple search API for Slack bot and other integrations
app.post("/search/:namespaceType/:namespaceId", async (c) => {
    const namespaceType = c.req.param("namespaceType")
    const namespaceId = c.req.param("namespaceId")
    const namespace = `${namespaceType}:${namespaceId}`

    try {
        const { query } = await c.req.json()

        if (!query) {
            return c.json({ error: "Missing query parameter" }, 400)
        }

        const memories = await searchMemories(query, namespace, c.env)

        return c.json({
            success: true,
            namespace,
            query,
            results: memories
        })
    } catch (error) {
        console.error(`Error searching memories in namespace ${namespace}:`, error)
        return c.json({ success: false, error: "Failed to search memories" }, 500)
    }
})

// Generic API endpoints for updating and deleting memories by ID
app.put("/api/memories/:memoryId", async (c) => {
    const memoryId = c.req.param("memoryId")
    let updatedContent: string

    try {
        // Get updated content from request body
        const body = await c.req.json()
        if (!body || typeof body.content !== "string" || body.content.trim() === "") {
            return c.json({ success: false, error: "Invalid or missing content in request body" }, 400)
        }
        updatedContent = body.content.trim()
    } catch (e) {
        console.error("Failed to parse request body:", e)
        return c.json({ success: false, error: "Failed to parse request body" }, 400)
    }

    try {
        // First, find which namespace this memory belongs to
        const memoryResult = await c.env.DB.prepare("SELECT namespace FROM memories WHERE id = ?")
            .bind(memoryId)
            .first()

        if (!memoryResult) {
            return c.json({ success: false, error: "Memory not found" }, 404)
        }

        const namespace = (memoryResult as any).namespace

        // Update in D1
        await updateMemoryInD1(memoryId, namespace, updatedContent, c.env)

        // Update vector in Vectorize
        try {
            await updateMemoryVector(memoryId, updatedContent, namespace, c.env)
        } catch (vectorError) {
            console.error(`Failed to update vector ${memoryId} in namespace ${namespace} in Vectorize:`, vectorError)
        }

        return c.json({ success: true })
    } catch (error: any) {
        console.error(`Error updating memory ${memoryId}:`, error)
        const errorMessage = error.message || "Failed to update memory"
        if (errorMessage.includes("not found")) {
            return c.json({ success: false, error: errorMessage }, 404)
        }
        return c.json({ success: false, error: errorMessage }, 500)
    }
})

app.delete("/api/memories/:memoryId", async (c) => {
    const memoryId = c.req.param("memoryId")

    try {
        // First, find which namespace this memory belongs to
        const memoryResult = await c.env.DB.prepare("SELECT namespace FROM memories WHERE id = ?")
            .bind(memoryId)
            .first()

        if (!memoryResult) {
            return c.json({ success: false, error: "Memory not found" }, 404)
        }

        const namespace = (memoryResult as any).namespace

        // Delete from D1
        await deleteMemoryFromD1(memoryId, namespace, c.env)

        // Delete from Vectorize index
        try {
            await deleteVectorById(memoryId, namespace, c.env)
        } catch (vectorError) {
            console.error(`Failed to delete vector ${memoryId} from namespace ${namespace} in Vectorize:`, vectorError)
        }

        return c.json({ success: true })
    } catch (error) {
        console.error(`Error deleting memory ${memoryId}:`, error)
        return c.json({ success: false, error: "Failed to delete memory" }, 500)
    }
})

// Handle MCP SSE endpoint for user namespace
app.all("/user/:userId/sse", async (c) => {
    const userId = c.req.param("userId")
    if (!userId) {
        console.error("No userId parameter found")
        return new Response("Bad Request: Missing userId", { status: 400 })
    }

    const namespace = `user:${userId}`
    const mcpServer = new MCPSSEServer(namespace, c.env)

    try {
        if (c.req.method === "OPTIONS") {
            return new Response(null, {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
                    "Access-Control-Max-Age": "86400"
                }
            })
        }
        
        if (c.req.method === "GET") return await mcpServer.handleSSEConnection()
        
        if (c.req.method === "POST") {
            const body = await c.req.json()
            const response = await mcpServer.handleJSONRPCRequest(body)
            return new Response(JSON.stringify(response), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            })
        }
        
        return new Response("Method Not Allowed", { status: 405 })
    } catch (error) {
        console.error("MCP error:", error)
        return new Response("Internal Server Error: MCP failed", { status: 500 })
    }
})

// Handle MCP SSE endpoint for project namespace
app.all("/project/:projectId/sse", async (c) => {
    const projectId = c.req.param("projectId")

    if (!projectId) {
        return new Response("Bad Request: Missing projectId", { status: 400 })
    }

    const namespace = `project:${projectId}`
    const mcpServer = new MCPSSEServer(namespace, c.env)

    try {
        if (c.req.method === "OPTIONS") {
            return new Response(null, {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
                    "Access-Control-Max-Age": "86400"
                }
            })
        }
        
        if (c.req.method === "GET") return await mcpServer.handleSSEConnection()
        
        if (c.req.method === "POST") {
            const body = await c.req.json()
            const response = await mcpServer.handleJSONRPCRequest(body)
            return new Response(JSON.stringify(response), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            })
        }
        
        return new Response("Method Not Allowed", { status: 405 })
    } catch (error) {
        console.error("MCP error:", error)
        return new Response("Internal Server Error: MCP failed", { status: 500 })
    }
})

// Handle MCP SSE endpoint for organization-wide namespace
app.all("/all/sse", async (c) => {

    const namespace = "all"
    const mcpServer = new MCPSSEServer(namespace, c.env)

    try {
        if (c.req.method === "OPTIONS") {
            return new Response(null, {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
                    "Access-Control-Max-Age": "86400"
                }
            })
        }
        
        if (c.req.method === "GET") return await mcpServer.handleSSEConnection()
        
        if (c.req.method === "POST") {
            const body = await c.req.json()
            const response = await mcpServer.handleJSONRPCRequest(body)
            return new Response(JSON.stringify(response), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            })
        }
        
        return new Response("Method Not Allowed", { status: 405 })
    } catch (error) {
        console.error("MCP error:", error)
        return new Response("Internal Server Error: MCP failed", { status: 500 })
    }
})

// Serve admin page
app.get("/admin", async (c) => {
    return c.html(await c.env.ASSETS.fetch("https://mcp-memory.loqwai.workers.dev/admin.html").then((r) => r.text()))
})

// Test endpoint to check database structure
app.get("/api/db-info", async (c) => {
    try {
        // Get table info
        const tableInfo = await c.env.DB.prepare("PRAGMA table_info(memories)").all()

        // Get count of memories
        const count = await c.env.DB.prepare("SELECT COUNT(*) as count FROM memories").first()

        // Get sample data
        const sample = await c.env.DB.prepare("SELECT * FROM memories LIMIT 5").all()

        return c.json({
            success: true,
            tableInfo: tableInfo.results,
            count: (count as any)?.count || 0,
            sample: sample.results
        })
    } catch (error) {
        console.error("Error getting database info:", error)
        return c.json(
            {
                success: false,
                error: "Failed to get database info",
                details: error instanceof Error ? error.message : String(error)
            },
            500
        )
    }
})

// Simple test endpoint to add a basic memory
app.post("/api/simple-test", async (c) => {
    try {
        const memoryId = crypto.randomUUID()
        const content = "This is a simple test memory"
        const namespace = "user:test"

        // Try to insert directly
        const result = await c.env.DB.prepare("INSERT INTO memories (id, content, namespace) VALUES (?, ?, ?)")
            .bind(memoryId, content, namespace)
            .run()


        return c.json({
            success: true,
            message: "Simple test memory created",
            memoryId,
            result
        })
    } catch (error) {
        console.error("Error creating simple test:", error)
        return c.json(
            {
                success: false,
                error: "Failed to create simple test",
                details: error instanceof Error ? error.message : String(error)
            },
            500
        )
    }
})

// Debug endpoint for vectorize
app.post("/api/debug-vector", async (c) => {
    try {
        const { text, namespace = "debug" } = await c.req.json()

        // Test embedding generation
        const embeddings = (await c.env.AI.run("@cf/baai/bge-m3", { text })) as any
        const values = embeddings.data[0]

        if (!values) {
            return c.json({ error: "Failed to generate embeddings" }, 500)
        }

        // Test vector storage
        const vectorId = crypto.randomUUID()
        await c.env.VECTORIZE.upsert([
            {
                id: vectorId,
                values,
                namespace,
                metadata: { content: text }
            }
        ])

        // Test vector search
        const searchResults = await c.env.VECTORIZE.query(values, {
            namespace,
            topK: 5,
            returnMetadata: "all"
        })

        return c.json({
            success: true,
            vectorId,
            embeddingLength: values.length,
            searchResults: {
                count: searchResults.matches?.length || 0,
                matches: searchResults.matches?.map((m) => ({
                    id: m.id,
                    score: m.score,
                    content: m.metadata?.content
                }))
            }
        })
    } catch (error) {
        console.error("Debug vector error:", error)
        return c.json(
            {
                error: "Vector operation failed",
                details: error instanceof Error ? error.message : String(error)
            },
            500
        )
    }
})

// Fallback to static assets
app.get("*", async (c) => {
    return c.env.ASSETS.fetch(c.req.raw)
})

export default app

export { MyMCP }

// Scheduled cron job for incremental vector backups
export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
    
    try {
        // Get the last backup timestamp from KV or D1
        const lastBackupResult = await env.DB.prepare(
            "SELECT value FROM system_metadata WHERE key = 'last_vector_backup'"
        ).first()
        
        const lastBackup = lastBackupResult?.value || '2000-01-01T00:00:00Z'
        const currentTime = new Date().toISOString()
        
        // Get memories created or updated since last backup
        const newMemories = await env.DB.prepare(
            `SELECT id, namespace, content, created_at 
             FROM memories 
             WHERE created_at > ? AND deleted_at IS NULL
             ORDER BY created_at ASC`
        ).bind(lastBackup).all()
        
        if (newMemories.results && newMemories.results.length > 0) {
            
            // For each memory, verify it exists in Vectorize
            let syncCount = 0
            for (const row of newMemories.results) {
                const memory = row as any
                try {
                    // Vectorize doesn't have a getByIds method, so we'll track sync in D1
                    // Check if this memory was synced to vectorize
                    const syncRecord = await env.DB.prepare(
                        "SELECT id FROM vector_sync WHERE memory_id = ?"
                    ).bind(memory.id).first()
                    
                    if (!syncRecord) {
                        // Re-create the vector if not synced
                        await storeMemory(memory.content, memory.namespace, env)
                        
                        // Mark as synced
                        await env.DB.prepare(
                            "INSERT INTO vector_sync (memory_id, synced_at) VALUES (?, ?)"
                        ).bind(memory.id, currentTime).run()
                        
                        syncCount++
                    }
                } catch (error) {
                    console.error(`Error checking vector for memory ${memory.id}:`, error)
                }
            }
            
        }
        
        // Update last backup timestamp
        await env.DB.prepare(
            `INSERT INTO system_metadata (key, value) VALUES ('last_vector_backup', ?)
             ON CONFLICT(key) DO UPDATE SET value = ?`
        ).bind(currentTime, currentTime).run()
        
    } catch (error) {
        console.error("Cron job error:", error)
    }
}
