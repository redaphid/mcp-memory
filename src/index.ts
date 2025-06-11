import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
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

// Simple OpenAPI doc endpoint
app.get("/doc", (c) => {
  const openAPISpec = {
    openapi: "3.0.0",
    info: {
      title: "MCP Memory API",
      version: "1.0.0",
      description: "Memory management system with vector search capabilities for AI assistants"
    },
    servers: [
      {
        url: c.req.url.replace(/\/doc.*$/, ""),
        description: "Current server"
      }
    ],
    paths: {
      "/api/namespaces": {
        get: {
          summary: "Get available namespaces",
          description: "Retrieve all available user and project namespaces",
          tags: ["Namespaces"],
          responses: {
            "200": {
              description: "Available namespaces",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      namespaces: {
                        type: "object",
                        properties: {
                          users: { type: "array", items: { type: "string" } },
                          projects: { type: "array", items: { type: "string" } },
                          all: { type: "boolean" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/search": {
        post: {
          summary: "Search across multiple namespaces",
          description: "Perform semantic search across selected namespaces",
          tags: ["Search"],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    namespaces: { type: "array", items: { type: "string" } },
                    dateFrom: { type: "string" },
                    dateTo: { type: "string" }
                  },
                  required: ["query", "namespaces"]
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Search results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      query: { type: "string" },
                      results: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            namespace: { type: "string" },
                            memories: {
                              type: "array",
                              items: {
                                type: "object",
                                properties: {
                                  id: { type: "string" },
                                  content: { type: "string" },
                                  score: { type: "number" }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/{namespaceType}/{namespaceId}/memories": {
        get: {
          summary: "Get memories for a namespace",
          description: "Retrieve paginated memories for a specific namespace",
          tags: ["Memories"],
          parameters: [
            {
              name: "namespaceType",
              in: "path",
              required: true,
              schema: { type: "string", enum: ["user", "project", "all"] }
            },
            {
              name: "namespaceId",
              in: "path",
              required: true,
              schema: { type: "string" }
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 }
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 }
            }
          ],
          responses: {
            "200": {
              description: "Memories retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      memories: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            content: { type: "string" },
                            created_at: { type: "string" }
                          }
                        }
                      },
                      namespace: { type: "string" },
                      pagination: {
                        type: "object",
                        properties: {
                          page: { type: "integer" },
                          limit: { type: "integer" },
                          total: { type: "integer" },
                          totalPages: { type: "integer" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: "Namespaces", description: "Namespace management" },
      { name: "Search", description: "Memory search operations" },
      { name: "Memories", description: "Memory CRUD operations" }
    ]
  };

  return c.json(openAPISpec);
});

// Swagger UI
app.get("/ui", swaggerUI({ url: "/doc" }));

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

// MCP SSE endpoint for user namespace
app.all("/user/:userId/sse", async (c) => {
  const userId = c.req.param("userId");

  if (!userId) {
    return c.json({ error: "Bad Request: Could not extract userId from URL path" }, 400);
  }

  // Get Durable Object ID for this user namespace
  const id = c.env.MCP_OBJECT.idFromName(`user:${userId}`);
  const stub = c.env.MCP_OBJECT.get(id);

  // Forward the request to the Durable Object
  return stub.fetch(c.req.raw);
});

// MCP SSE endpoint for project namespace
app.all("/project/:projectId/sse", async (c) => {
  const projectId = c.req.param("projectId");

  if (!projectId) {
    return c.json({ error: "Bad Request: Could not extract projectId from URL path" }, 400);
  }

  // Get Durable Object ID for this project namespace
  const id = c.env.MCP_OBJECT.idFromName(`project:${projectId}`);
  const stub = c.env.MCP_OBJECT.get(id);

  // Forward the request to the Durable Object
  return stub.fetch(c.req.raw);
});

// MCP SSE endpoint for organization-wide namespace
app.all("/all/sse", async (c) => {
  // Get Durable Object ID for the global namespace
  const id = c.env.MCP_OBJECT.idFromName("all");
  const stub = c.env.MCP_OBJECT.get(id);

  // Forward the request to the Durable Object
  return stub.fetch(c.req.raw);
});

// Legacy support - redirect old format to new user namespace
app.get("/:userId", async (c) => {
  const userId = c.req.param("userId");

  // Skip if it's a reserved path
  if (!userId || userId === 'user' || userId === 'project' || userId === 'all' || userId === 'api' || userId === 'doc' || userId === 'ui') {
    return c.notFound();
  }

  // Redirect to new user namespace format
  const url = new URL(c.req.url);
  const newUrl = `${url.origin}/user/${userId}${url.pathname.substring(userId.length + 1)}`;
  return c.redirect(newUrl, 301);
});

export default app;

export { MyMCP };
