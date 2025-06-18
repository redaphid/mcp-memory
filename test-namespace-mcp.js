const { EventSource } = require('eventsource');

// Test the MCP server with namespace functionality
async function testNamespaceMCPServer() {
  console.log('🔗 Starting MCP Memory server namespace functionality tests...\n');

  // Test different namespace scenarios
  const scenarios = [
    {
      name: 'User namespace endpoint',
      serverUrl: 'https://mcp-memory.loqwai.workers.dev/user/test-user/sse',
      expectedDefaultNamespace: 'user:test-user'
    },
    {
      name: 'Project namespace endpoint',
      serverUrl: 'https://mcp-memory.loqwai.workers.dev/project/test-project/sse',
      expectedDefaultNamespace: 'project:test-project'
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📝 Testing ${scenario.name}...`);
    console.log(`🔗 Connecting to: ${scenario.serverUrl}`);

    try {
      // Test 1: Store memory without specifying namespace (should use default)
      console.log('\n📝 Test 1: Storing memory without namespace parameter...');
      const storeResponse1 = await fetch(scenario.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'addToMCPMemory',
            arguments: {
              thingToRemember: `Test memory for ${scenario.expectedDefaultNamespace} without namespace param`
            }
          }
        })
      });

      const storeResult1 = await storeResponse1.json();
      console.log('Store result (default namespace):', JSON.stringify(storeResult1, null, 2));

      // Test 2: Store memory with explicit namespace parameter
      console.log('\n📝 Test 2: Storing memory with explicit namespace parameter...');
      const customNamespace = 'user:custom-test-user';
      const storeResponse2 = await fetch(scenario.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'addToMCPMemory',
            arguments: {
              thingToRemember: `Test memory for custom namespace ${customNamespace}`,
              namespace: customNamespace
            }
          }
        })
      });

      const storeResult2 = await storeResponse2.json();
      console.log('Store result (custom namespace):', JSON.stringify(storeResult2, null, 2));

      // Test 3: Search without namespace parameter (should use default)
      console.log('\n🔍 Test 3: Searching without namespace parameter...');
      const searchResponse1 = await fetch(scenario.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'searchMCPMemory',
            arguments: {
              informationToGet: 'test memory'
            }
          }
        })
      });

      const searchResult1 = await searchResponse1.json();
      console.log('Search result (default namespace):', JSON.stringify(searchResult1, null, 2));

      // Test 4: Search with explicit namespace parameter
      console.log('\n🔍 Test 4: Searching with explicit namespace parameter...');
      const searchResponse2 = await fetch(scenario.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'searchMCPMemory',
            arguments: {
              informationToGet: 'test memory custom',
              namespace: customNamespace
            }
          }
        })
      });

      const searchResult2 = await searchResponse2.json();
      console.log('Search result (custom namespace):', JSON.stringify(searchResult2, null, 2));

      // Test 5: Search across all namespaces
      console.log('\n🌐 Test 5: Searching across all namespaces...');
      const searchAllResponse = await fetch(scenario.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'searchAllMemories',
            arguments: {
              query: 'test memory'
            }
          }
        })
      });

      const searchAllResult = await searchAllResponse.json();
      console.log('Search all result:', JSON.stringify(searchAllResult, null, 2));

      console.log(`\n✅ ${scenario.name} tests completed successfully!`);

    } catch (error) {
      console.error(`❌ Error testing ${scenario.name}:`, error);
    }
  }
}

// Test the tool discovery and schema validation
async function testToolDiscovery() {
  console.log('\n🔧 Testing tool discovery and schema validation...');

  const serverUrl = 'https://mcp-memory.loqwai.workers.dev/user/test-user/sse';

  try {
    // Test tools/list to see if our new parameters are properly exposed
    const toolsResponse = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'tools-test',
        method: 'tools/list'
      })
    });

    const toolsResult = await toolsResponse.json();
    console.log('Tools list response:', JSON.stringify(toolsResult, null, 2));

    // Validate that our tools have the new namespace parameter
    if (toolsResult.result && toolsResult.result.tools) {
      const addMemoryTool = toolsResult.result.tools.find(tool => tool.name === 'addToMCPMemory');
      const searchMemoryTool = toolsResult.result.tools.find(tool => tool.name === 'searchMCPMemory');

      if (addMemoryTool && addMemoryTool.inputSchema.properties.namespace) {
        console.log('✅ addToMCPMemory tool has namespace parameter');
      } else {
        console.log('❌ addToMCPMemory tool missing namespace parameter');
      }

      if (searchMemoryTool && searchMemoryTool.inputSchema.properties.namespace) {
        console.log('✅ searchMCPMemory tool has namespace parameter');
      } else {
        console.log('❌ searchMCPMemory tool missing namespace parameter');
      }
    }

  } catch (error) {
    console.error('❌ Error testing tool discovery:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive MCP Memory namespace functionality tests...\n');

  await testToolDiscovery();
  await testNamespaceMCPServer();

  console.log('\n🎉 All tests completed!');
  console.log('📊 Summary:');
  console.log('- Tool discovery and schema validation');
  console.log('- Memory storage with default namespace');
  console.log('- Memory storage with custom namespace parameter');
  console.log('- Memory search with default namespace');
  console.log('- Memory search with custom namespace parameter');
  console.log('- Cross-namespace memory search');
}

// Run the comprehensive test suite
runAllTests().then(() => {
  console.log('\n✅ MCP Memory namespace functionality test suite completed!');
}).catch(error => {
  console.error('❌ Test suite failed:', error);
});
