import { Hono } from "hono";
import { MyMCP } from "./mcp";
import { getAllMemoriesFromD1, initializeDatabase, deleteMemoryFromD1, updateMemoryInD1 } from "./utils/db";
import { deleteVectorById, updateMemoryVector, searchMemories } from "./utils/vectorize";

const app = new Hono<{
  Bindings: Env;
}>();

// Initialize database once
let dbInitialized = false;

// Middleware for one-time database initialization
app.use("*", async (c, next) => {
  if (!dbInitialized) {
    try {
      console.log("Attempting database initialization...");
      await initializeDatabase(c.env);
      dbInitialized = true;
      console.log("Database initialized successfully.");
    } catch (e) {
      console.error("Failed to initialize D1 database:", e);
    }
  }
  await next();
});

// index.html
app.get("/", async (c) => await c.env.ASSETS.fetch(c.req.raw));

// Get available namespaces (users and projects)
app.get("/api/namespaces", async (c) => {
  try {
    // Get distinct namespaces from the database
    const result = await c.env.DB.prepare(`
      SELECT DISTINCT namespace FROM memories
    `).all();

    const namespaces = {
      users: [] as string[],
      projects: [] as string[],
      all: false
    };

    if (result.results) {
      for (const row of result.results) {
        const namespace = (row as any).namespace;
        if (namespace.startsWith("user:")) {
          namespaces.users.push(namespace.substring(5));
        } else if (namespace.startsWith("project:")) {
          namespaces.projects.push(namespace.substring(8));
        } else if (namespace === "all") {
          namespaces.all = true;
        }
      }
    }

    return c.json({ success: true, namespaces });
  } catch (error) {
    console.error("Error getting namespaces:", error);
    return c.json({ success: false, error: "Failed to retrieve namespaces" }, 500);
  }
});

// Search across multiple namespaces
app.post("/api/search", async (c) => {
  try {
    const body = await c.req.json();
    const { query, namespaces = [], dateFrom, dateTo } = body;

    if (!query) {
      return c.json({ error: "Missing query parameter" }, 400);
    }

    const results = [];
    
    // Search each namespace
    for (const namespace of namespaces) {
      try {
        const memories = await searchMemories(query, namespace, c.env);
        
        // If date filtering is requested, we'll need to fetch from D1 to get dates
        if (dateFrom || dateTo) {
          const dbMemories = await c.env.DB.prepare(`
            SELECT id, created_at FROM memories 
            WHERE namespace = ? 
            ${dateFrom ? "AND created_at >= ?" : ""}
            ${dateTo ? "AND created_at <= ?" : ""}
          `).bind(
            namespace,
            ...(dateFrom ? [dateFrom] : []),
            ...(dateTo ? [dateTo] : [])
          ).all();
          
          const validIds = new Set((dbMemories.results || []).map((m: any) => m.id));
          
          results.push({
            namespace,
            memories: memories.filter(m => validIds.has(m.id))
          });
        } else {
          results.push({ namespace, memories });
        }
      } catch (error) {
        console.error(`Error searching namespace ${namespace}:`, error);
      }
    }

    return c.json({ 
      success: true,
      query,
      results 
    });
  } catch (error) {
    console.error("Error in multi-namespace search:", error);
    return c.json({ success: false, error: "Failed to search memories" }, 500);
  }
});

// Get all memories for a namespace with pagination
app.get("/:namespaceType/:namespaceId/memories", async (c) => {
  const namespaceType = c.req.param("namespaceType");
  const namespaceId = c.req.param("namespaceId");
  const namespace = `${namespaceType}:${namespaceId}`;
  
  // Pagination parameters
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = (page - 1) * limit;
  const sortBy = c.req.query("sortBy") || "date";

  try {
    // Get total count
    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM memories WHERE namespace = ?"
    ).bind(namespace).first();
    
    const total = (countResult as any)?.total || 0;
    
    // Get paginated results
    const orderBy = sortBy === "date" ? "created_at DESC" : "created_at DESC";
    const memories = await c.env.DB.prepare(
      `SELECT id, content, created_at FROM memories 
       WHERE namespace = ? 
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    ).bind(namespace, limit, offset).all();

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
    });
  } catch (error) {
    console.error(`Error retrieving memories for namespace ${namespace}:`, error);
    return c.json({ success: false, error: "Failed to retrieve memories" }, 500);
  }
});

// Delete a memory for a namespace
app.delete("/:namespaceType/:namespaceId/memories/:memoryId", async (c) => {
  const namespaceType = c.req.param("namespaceType");
  const namespaceId = c.req.param("namespaceId");
  const memoryId = c.req.param("memoryId");
  const namespace = `${namespaceType}:${namespaceId}`;

  try {
    // 1. Delete from D1
    await deleteMemoryFromD1(memoryId, namespace, c.env);
    console.log(`Deleted memory ${memoryId} for namespace ${namespace} from D1.`);

    // 2. Delete from Vectorize index
    try {
      await deleteVectorById(memoryId, namespace, c.env);
      console.log(`Attempted to delete vector ${memoryId} for namespace ${namespace} from Vectorize.`);
    } catch (vectorError) {
      console.error(`Failed to delete vector ${memoryId} for namespace ${namespace} from Vectorize:`, vectorError);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error(`Error deleting memory ${memoryId} (D1 primary) for namespace ${namespace}:`, error);
    return c.json({ success: false, error: "Failed to delete memory" }, 500);
  }
});

// Update a specific memory for a namespace
app.put("/:namespaceType/:namespaceId/memories/:memoryId", async (c) => {
  const namespaceType = c.req.param("namespaceType");
  const namespaceId = c.req.param("namespaceId");
  const memoryId = c.req.param("memoryId");
  const namespace = `${namespaceType}:${namespaceId}`;
  let updatedContent: string;

  try {
    // Get updated content from request body
    const body = await c.req.json();
    if (!body || typeof body.content !== "string" || body.content.trim() === "") {
      return c.json({ success: false, error: "Invalid or missing content in request body" }, 400);
    }
    updatedContent = body.content.trim();
  } catch (e) {
    console.error("Failed to parse request body:", e);
    return c.json({ success: false, error: "Failed to parse request body" }, 400);
  }

  try {
    // 1. Update in D1
    await updateMemoryInD1(memoryId, namespace, updatedContent, c.env);
    console.log(`Updated memory ${memoryId} for namespace ${namespace} in D1.`);

    // 2. Update vector in Vectorize
    try {
      await updateMemoryVector(memoryId, updatedContent, namespace, c.env);
      console.log(`Updated vector ${memoryId} for namespace ${namespace} in Vectorize.`);
    } catch (vectorError) {
      console.error(`Failed to update vector ${memoryId} for namespace ${namespace} in Vectorize:`, vectorError);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error(`Error updating memory ${memoryId} for namespace ${namespace}:`, error);
    const errorMessage = error.message || "Failed to update memory";
    if (errorMessage.includes("not found")) {
      return c.json({ success: false, error: errorMessage }, 404);
    }
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Simple search API for Slack bot and other integrations
app.post("/search/:namespaceType/:namespaceId", async (c) => {
  const namespaceType = c.req.param("namespaceType");
  const namespaceId = c.req.param("namespaceId");
  const namespace = `${namespaceType}:${namespaceId}`;
  
  try {
    const { query } = await c.req.json();
    
    if (!query) {
      return c.json({ error: "Missing query parameter" }, 400);
    }
    
    const memories = await searchMemories(query, namespace, c.env);
    
    return c.json({ 
      success: true,
      namespace,
      query,
      memories 
    });
  } catch (error) {
    console.error(`Error searching memories in namespace ${namespace}:`, error);
    return c.json({ success: false, error: "Failed to search memories" }, 500);
  }
});

// Generic API endpoints for updating and deleting memories by ID
app.put("/api/memories/:memoryId", async (c) => {
  const memoryId = c.req.param("memoryId");
  let updatedContent: string;

  try {
    // Get updated content from request body
    const body = await c.req.json();
    if (!body || typeof body.content !== "string" || body.content.trim() === "") {
      return c.json({ success: false, error: "Invalid or missing content in request body" }, 400);
    }
    updatedContent = body.content.trim();
  } catch (e) {
    console.error("Failed to parse request body:", e);
    return c.json({ success: false, error: "Failed to parse request body" }, 400);
  }

  try {
    // First, find which namespace this memory belongs to
    const memoryResult = await c.env.DB.prepare(
      "SELECT namespace FROM memories WHERE id = ?"
    ).bind(memoryId).first();

    if (!memoryResult) {
      return c.json({ success: false, error: "Memory not found" }, 404);
    }

    const namespace = (memoryResult as any).namespace;

    // Update in D1
    await updateMemoryInD1(memoryId, namespace, updatedContent, c.env);
    console.log(`Updated memory ${memoryId} in namespace ${namespace} in D1.`);

    // Update vector in Vectorize
    try {
      await updateMemoryVector(memoryId, updatedContent, namespace, c.env);
      console.log(`Updated vector ${memoryId} in namespace ${namespace} in Vectorize.`);
    } catch (vectorError) {
      console.error(`Failed to update vector ${memoryId} in namespace ${namespace} in Vectorize:`, vectorError);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error(`Error updating memory ${memoryId}:`, error);
    const errorMessage = error.message || "Failed to update memory";
    if (errorMessage.includes("not found")) {
      return c.json({ success: false, error: errorMessage }, 404);
    }
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

app.delete("/api/memories/:memoryId", async (c) => {
  const memoryId = c.req.param("memoryId");

  try {
    // First, find which namespace this memory belongs to
    const memoryResult = await c.env.DB.prepare(
      "SELECT namespace FROM memories WHERE id = ?"
    ).bind(memoryId).first();

    if (!memoryResult) {
      return c.json({ success: false, error: "Memory not found" }, 404);
    }

    const namespace = (memoryResult as any).namespace;

    // Delete from D1
    await deleteMemoryFromD1(memoryId, namespace, c.env);
    console.log(`Deleted memory ${memoryId} from namespace ${namespace} in D1.`);

    // Delete from Vectorize index
    try {
      await deleteVectorById(memoryId, namespace, c.env);
      console.log(`Deleted vector ${memoryId} from namespace ${namespace} in Vectorize.`);
    } catch (vectorError) {
      console.error(`Failed to delete vector ${memoryId} from namespace ${namespace} in Vectorize:`, vectorError);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error(`Error deleting memory ${memoryId}:`, error);
    return c.json({ success: false, error: "Failed to delete memory" }, 500);
  }
});

// Mount handler for user namespace
app.mount("/user/:userId", async (req, env, ctx) => {
  const url = new URL(req.url);
  const match = url.pathname.match(/\/user\/([^\/]+)/);
  const userId = match ? match[1] : null;

  if (!userId) {
    return new Response("Bad Request: Could not extract userId from URL path", { status: 400 });
  }

  // Pass namespace info to the MCP agent
  ctx.props = {
    namespace: `user:${userId}`,
    namespaceType: 'user' as const,
  };

  const response = await MyMCP.mount(`/user/${userId}/sse`).fetch(req, env, ctx);
  if (response) {
    return response;
  }

  return new Response("Not Found within MCP mount", { status: 404 });
});

// Mount handler for project namespace
app.mount("/project/:projectId", async (req, env, ctx) => {
  const url = new URL(req.url);
  const match = url.pathname.match(/\/project\/([^\/]+)/);
  const projectId = match ? match[1] : null;

  if (!projectId) {
    return new Response("Bad Request: Could not extract projectId from URL path", { status: 400 });
  }

  // Pass namespace info to the MCP agent
  ctx.props = {
    namespace: `project:${projectId}`,
    namespaceType: 'project' as const,
  };

  const response = await MyMCP.mount(`/project/${projectId}/sse`).fetch(req, env, ctx);
  if (response) {
    return response;
  }

  return new Response("Not Found within MCP mount", { status: 404 });
});

// Mount handler for organization-wide namespace (future feature)
app.mount("/all", async (req, env, ctx) => {
  // Pass namespace info to the MCP agent
  ctx.props = {
    namespace: 'all',
    namespaceType: 'all' as const,
  };

  const response = await MyMCP.mount("/all/sse").fetch(req, env, ctx);
  if (response) {
    return response;
  }

  return new Response("Not Found within MCP mount", { status: 404 });
});

// Legacy support - redirect old format to new user namespace
app.mount("/:userId", async (req, env, ctx) => {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split("/");
  const userId = pathSegments[1];
  
  if (!userId || userId === 'user' || userId === 'project' || userId === 'all' || userId === 'api') {
    return new Response("Not Found", { status: 404 });
  }

  // Redirect to new user namespace format
  return Response.redirect(`${url.origin}/user/${userId}${pathSegments.slice(2).join('/')}`, 301);
});

export default app;

export { MyMCP };
