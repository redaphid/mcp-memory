// Debug script for cross-namespace search
// Use Node.js built-in fetch (available in Node 18+)

async function debugCrossNamespaceSearch() {
    const BASE_URL = "https://mcp-memory.loqwai.workers.dev"
    
    console.log("Testing cross-namespace search...")
    
    const response = await fetch(`${BASE_URL}/user/test/sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: "searchAllMemories",
                arguments: {
                    query: "distributed systems"
                }
            },
            id: 1
        })
    })
    
    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))
    
    const text = await response.text()
    console.log("Raw response body:", text)
    
    try {
        const data = JSON.parse(text)
        console.log("Parsed JSON:", JSON.stringify(data, null, 2))
    } catch (e) {
        console.log("Failed to parse JSON:", e.message)
    }
}

debugCrossNamespaceSearch().catch(console.error)