import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { McpAgent } from "agents/mcp"
import { z } from "zod"

type MemoryProps = {
  userId: string
}

export class Memory extends McpAgent<any, {}, MemoryProps> {
  server = new McpServer({
    name: "MCP Memory",
    version: "0.0.1"
  })

  async init() {
    this.server.tool(
      "addToMCPMemory",
      "Store important user information in a persistent memory layer",
      { 
        thingToRemember: z.string().describe("The content to remember"),
        tags: z.array(z.string()).optional().describe("Array of tags to categorize the memory for better search"),
        ttlSeconds: z.number().optional().describe("Time to live in seconds - memory will auto-delete after this time")
      },
      async ({ thingToRemember, tags, ttlSeconds }) => {
        return {
          content: [{ type: "text", text: `Remembered: ${thingToRemember}` }],
        }
      }
    )

    this.server.tool(
      "searchMCPMemory",
      "Search the user's persistent memory layer for relevant information",
      { 
        informationToGet: z.string().describe("Search query describing what information you're looking for"),
        limit: z.number().optional().describe("Maximum number of results to return (default: 10)"),
        sortBy: z.enum(["relevance", "newest", "oldest"]).optional().describe("How to sort results (default: relevance)")
      },
      async ({ informationToGet, limit = 10, sortBy = "relevance" }) => {
        return {
          content: [{ type: "text", text: `Found 0 memories for: ${informationToGet}` }],
        }
      }
    )
  }
}