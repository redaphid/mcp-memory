import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { storeMemoryInD1 } from "./utils/db";
import { searchMemories, storeMemory } from "./utils/vectorize";
import { version } from "../package.json";

type MyMCPProps = {
  namespace: string;      // e.g., "user:alice", "project:frontend", "all"
  namespaceType: 'user' | 'project' | 'all';
};

export class MyMCP extends McpAgent<Env, {}, MyMCPProps> {
  server = new McpServer({
    name: "MCP Memory",
    version,
  });

  async init() {
    const env = this.env as Env;

    this.server.tool(
      "addToMCPMemory",
      `This tool stores important information in a persistent memory layer. Use it when:
      1. User explicitly asks to remember something ("remember this...")
      2. You detect significant user preferences, traits, or patterns worth preserving
      3. Technical details, examples, or emotional responses emerge that would be valuable in future interactions
      4. Important project information, documentation, or code patterns should be preserved

      The memory will be stored in the current namespace (user, project, or organization-wide).
      This tool must be invoked through a function call - it is not a passive resource but an active storage mechanism.`,
      { thingToRemember: z.string().describe("No description") },
      async ({ thingToRemember }) => {
        try {
          // Store in Vectorize using the refactored function
          const memoryId = await storeMemory(thingToRemember, this.props.namespace, env);

          // Also store content in D1 database
          await storeMemoryInD1(thingToRemember, this.props.namespace, env, memoryId);

          console.log(
            `Memory stored successfully in namespace '${this.props.namespace}' with ID: ${memoryId}, content: "${thingToRemember}"`
          );

          return {
            content: [{ type: "text", text: `Remembered in ${this.props.namespace}: ${thingToRemember}` }],
          };
        } catch (error) {
          console.error("Error storing memory:", error);
          return {
            content: [{ type: "text", text: "Failed to remember: " + String(error) }],
          };
        }
      }
    );

    this.server.tool(
      "searchMCPMemory",
      `This tool searches the persistent memory layer for relevant information, preferences, and past context.
      It uses semantic matching to find connections between your query and stored memories, even when exact keywords don't match.
      Use this tool when:
      1. You need historical context about the user's preferences or past interactions
      2. You need to find project-specific information, documentation, or code patterns
      3. The user refers to something they previously mentioned or asked you to remember
      4. You need to verify if specific information exists in the current namespace

      The search is performed within the current namespace (user, project, or organization-wide).
      This tool must be explicitly invoked through a function call - it is not a passive resource but an active search mechanism.`,
      { informationToGet: z.string().describe("No description") },
      async ({ informationToGet }) => {
        try {
          console.log(`Searching in namespace '${this.props.namespace}' with query: "${informationToGet}"`);

          // Use the refactored function to search memories
          const memories = await searchMemories(informationToGet, this.props.namespace, env);

          console.log(`Search returned ${memories.length} matches`);

          if (memories.length > 0) {
            return {
              content: [
                {
                  type: "text",
                  text:
                    `Found memories in ${this.props.namespace}:\n` + memories.map((m) => `${m.content} (score: ${m.score.toFixed(4)})`).join("\n"),
                },
              ],
            };
          }

          return {
            content: [{ type: "text", text: `No relevant memories found in ${this.props.namespace}.` }],
          };
        } catch (error) {
          console.error("Error searching memories:", error);
          return {
            content: [{ type: "text", text: "Failed to search memories: " + String(error) }],
          };
        }
      }
    );
  }
}
