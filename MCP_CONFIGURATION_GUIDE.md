# Complete Guide: Configuring MCP Servers with Claude Code CLI

## Overview
This guide documents the complete process for configuring, debugging, and managing MCP (Model Context Protocol) servers with Claude Code CLI, including handling different transport types, debugging connection issues, and managing configurations across different scopes.

## Understanding MCP Configuration in Claude Code

### Configuration Locations
1. **User-level**: Available in all projects (`~/.config/claude-code/`)
2. **Project-level**: Via `.mcp.json` in project directory
3. **Local-level**: Current directory only

### MCP Server Types
- **stdio**: Command-based servers (npm packages, executables)
- **sse**: Server-Sent Events (HTTP endpoints)
- **http**: Standard HTTP endpoints

## Step-by-Step MCP Configuration Process

### 1. Investigate Current Configuration
```bash
# List all configured MCP servers
claude mcp list

# Check for existing MCP configuration files
find . -name ".mcp.json" -o -name "mcp*.json"

# Examine MCP logs location
ls -la ~/Library/Caches/claude-cli-nodejs/-Users-$(whoami | tr '/' '-')-$(pwd | tr '/' '-')/
```

### 2. Manage Existing Servers
```bash
# Remove servers from specific scopes
claude mcp remove [server-name] -s user
claude mcp remove [server-name] -s project
claude mcp remove [server-name] -s local

# Handle servers in multiple scopes
# Claude will prompt which scope to remove from
claude mcp remove [server-name]
```

### 3. Add MCP Servers

#### For stdio servers (npm packages, executables):
```bash
# Basic stdio server
claude mcp add -s user [server-name] [command] [args...]

# Example with npm package
claude mcp add -s user github npx -- -y @modelcontextprotocol/server-github
```

#### For SSE servers (HTTP endpoints):
```bash
# SSE server with URL
claude mcp add -s user -t sse [server-name] [url]

# With headers for authentication
claude mcp add -s user -t sse [server-name] [url] \
  -H "Authorization: Bearer token" \
  -H "X-Custom-Header: value"
```

### 4. Debug Connection Issues

#### Check MCP logs:
```bash
# Find log directories
ls ~/Library/Caches/claude-cli-nodejs/-Users-*/mcp-logs-*/

# Monitor latest logs
tail -f ~/Library/Caches/claude-cli-nodejs/-Users-*/mcp-logs-[server-name]/$(ls -t ~/Library/Caches/claude-cli-nodejs/-Users-*/mcp-logs-[server-name]/ | head -1)
```

#### Common log patterns:
- `"No token data found"` - Authentication missing
- `"SSE error: undefined"` - Connection failed
- `"getaddrinfo ENOTFOUND"` - Invalid URL
- `"Connection timeout"` - Server not responding
- `"Running on stdio"` - Normal startup message

### 5. Test MCP Servers

#### Create test scripts:
```bash
# Basic test
cat > test-mcp.sh << 'EOF'
#!/bin/bash
SERVER_NAME=$1
echo "Testing MCP server: $SERVER_NAME"

claude << PROMPT
Can you test the $SERVER_NAME MCP server by calling one of its tools?
PROMPT
EOF

chmod +x test-mcp.sh
```

#### Test with different permission modes:
```bash
# Interactive (will prompt for permissions)
./test-mcp.sh [server-name]

# Pre-approved permissions
claude --allowedTools "mcp__[server-name]__*" << 'EOF'
Test the MCP server
EOF

# Skip all permissions (development only)
claude --dangerously-skip-permissions << 'EOF'
Test the MCP server
EOF
```

### 6. Configure Project-Level Servers
Create `.mcp.json` in project root:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "command",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

### 7. Set Default Permissions
Create `CLAUDE.md` in project:
```markdown
# Claude Project Configuration

## MCP Server Permissions
Allow all tools from specific servers:
- `mcp__servername__*`

## Project Context
Description of what MCP servers are used for in this project.
```

## Configuring the coding-philosophy SSE Server

Based on the Cursor configuration provided, here's how to add it to Claude Code:

```bash
# Add the coding-philosophy SSE server
claude mcp add -s user -t sse coding-philosophy \
  https://mcp-memory.loqwai.workers.dev/project/coding-philosophy/sse

# If authentication is needed, add headers
claude mcp add -s user -t sse coding-philosophy \
  https://mcp-memory.loqwai.workers.dev/project/coding-philosophy/sse \
  -H "Authorization: Bearer your-token-here"

# Verify it's added
claude mcp list

# Test the server
claude << 'EOF'
Can you connect to the coding-philosophy MCP server and list available tools?
EOF
```

## Debugging Workflow

1. **Check server is listed**: `claude mcp list`
2. **Monitor logs during connection**:
   ```bash
   # In one terminal
   tail -f ~/Library/Caches/claude-cli-nodejs/-Users-*/mcp-logs-coding-philosophy/*.txt
   
   # In another terminal
   claude "Test the coding-philosophy server"
   ```
3. **Verify server response**: Look for successful connection messages
4. **Test with minimal permissions**: Use `--dangerously-skip-permissions` for initial testing

## MCP Configuration Reference

### CLI Commands
```bash
claude mcp add [options] <name> <commandOrUrl> [args...]
  -s, --scope <scope>          Configuration scope (local, user, or project)
  -t, --transport <transport>  Transport type (stdio, sse, http)
  -e, --env <env...>          Set environment variables
  -H, --header <header...>    Set HTTP headers for SSE/HTTP

claude mcp remove <name> [-s scope]
claude mcp list
```

### Environment Variables
```bash
# For debugging
export MCP_DEBUG=1

# For authentication
export API_TOKEN="your-token"
```

## Complete Example: Setting Up Multiple MCP Servers

```bash
#!/bin/bash
# setup-mcp-servers.sh

echo "Setting up MCP servers for Claude Code..."

# Remove any existing configurations
claude mcp remove coding-philosophy -s user 2>/dev/null
claude mcp remove github -s user 2>/dev/null

# Add SSE server
claude mcp add -s user -t sse coding-philosophy \
  https://mcp-memory.loqwai.workers.dev/project/coding-philosophy/sse

# Add stdio server  
claude mcp add -s user github npx -- -y @modelcontextprotocol/server-github

# List configured servers
echo -e "\nConfigured MCP servers:"
claude mcp list

# Test each server
echo -e "\nTesting servers..."
for server in coding-philosophy github; do
  echo "Testing $server..."
  claude --allowedTools "mcp__${server}__*" << EOF
Test the $server MCP server by listing its available tools.
EOF
done
```

This comprehensive guide provides all the tools and knowledge needed to configure any MCP server with Claude Code, debug issues, and maintain a working configuration.