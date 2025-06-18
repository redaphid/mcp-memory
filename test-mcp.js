const { EventSource } = require('eventsource');

// Test the MCP server
async function testMCPServer() {
  const serverUrl = 'https://mcp-memory.loqwai.workers.dev/user/test-user/sse';

  console.log('🔗 Connecting to MCP server:', serverUrl);

  try {
    // Test 1: Store a memory
    console.log('\n📝 Test 1: Storing a memory...');
    const storeResponse = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'storeMemory',
          arguments: {
            thingToRemember: 'I love working with TypeScript and React for building modern web applications'
          }
        }
      })
    });

    const storeResult = await storeResponse.text();
    console.log('Store result:', storeResult);

    // Test 2: Search for memories
    console.log('\n🔍 Test 2: Searching for memories...');
    const searchResponse = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'searchMemories',
          arguments: {
            informationToGet: 'TypeScript'
          }
        }
      })
    });

    const searchResult = await searchResponse.text();
    console.log('Search result:', searchResult);

    // Test 3: Search across all memories
    console.log('\n🌐 Test 3: Searching across all namespaces...');
    const searchAllResponse = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'searchAllMemories',
          arguments: {
            query: 'TypeScript'
          }
        }
      })
    });

    const searchAllResult = await searchAllResponse.text();
    console.log('Search all result:', searchAllResult);

  } catch (error) {
    console.error('❌ Error testing MCP server:', error);
  }
}

// Run the test
testMCPServer().then(() => {
  console.log('\n✅ MCP server test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
});
