# MCP Memory - Namespace-Based Architecture

This document describes the enhanced namespace-based architecture for MCP Memory, which now supports personal memories, project-based memories, and organization-wide memories.

## New URL Structure

The MCP Memory server now supports different namespace types:

- **User namespace**: `/user/{userId}/sse` - Personal memories for individual users
- **Project namespace**: `/project/{projectId}/sse` - Shared memories for projects
- **Organization namespace**: `/all/sse` - Organization-wide memories (future feature)

## Configuration Examples

### Cursor/Cline Configuration

For project-based MCP servers, add to your project's configuration:

```json
{
  "mcpServers": {
    "personal-memory": {
      "url": "https://memory.yourcompany.com/user/alice@company.com/sse",
      "transport": "sse",
      "description": "Your personal memory across all projects"
    },
    "project-memory": {
      "url": "https://memory.yourcompany.com/project/frontend-app/sse",
      "transport": "sse",
      "description": "Shared memory for the frontend-app project"
    }
  }
}
```

## API Endpoints

### MCP Protocol (SSE)
- User memories: `https://memory.yourcompany.com/user/{userId}/sse`
- Project memories: `https://memory.yourcompany.com/project/{projectId}/sse`

### REST API for Integrations

#### Search memories
```bash
POST /search/{namespaceType}/{namespaceId}
Content-Type: application/json

{
  "query": "authentication flow"
}
```

Example:
```bash
curl -X POST https://memory.yourcompany.com/search/project/frontend-app \
  -H "Content-Type: application/json" \
  -d '{"query": "authentication flow"}'
```

#### Get all memories
```bash
GET /{namespaceType}/{namespaceId}/memories
```

#### Delete a memory
```bash
DELETE /{namespaceType}/{namespaceId}/memories/{memoryId}
```

#### Update a memory
```bash
PUT /{namespaceType}/{namespaceId}/memories/{memoryId}
Content-Type: application/json

{
  "content": "Updated memory content"
}
```

## Slack Bot Integration

Your Cloudflare Slack bot can directly access the same Vectorize indices:

```typescript
// In your Slack bot worker
const response = await fetch(`${env.MEMORY_URL}/search/project/frontend-app`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "How do we handle authentication?"
  })
});

const { memories } = await response.json();
// Use memories to generate AI response
```

## Migration from Old Format

The server maintains backward compatibility by redirecting old URLs:
- Old: `/{userId}/sse`
- Redirects to: `/user/{userId}/sse`

## Namespace Examples

- Personal: `user:alice@company.com`
- Project: `project:frontend-app`
- Team project: `project:team-backend-api`
- Future: `all` (organization-wide)

## Database Schema

The D1 database now uses a `namespace` column instead of `userId`:

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_namespace ON memories(namespace);
```

## Deployment

No changes to deployment process. The same Cloudflare Workers, D1, and Vectorize setup applies.

## Benefits

1. **Project Context**: Each project can maintain its own knowledge base
2. **Personal Context**: Users keep personal preferences across projects
3. **Team Collaboration**: Teams share project-specific knowledge
4. **Slack Integration**: Bots can query project knowledge to answer questions
5. **Flexible Architecture**: Easy to add new namespace types in the future
