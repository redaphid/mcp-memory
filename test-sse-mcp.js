const { EventSource } = require('eventsource');

// Test the MCP server using SSE
async function testMCPServerSSE() {
  const serverUrl = 'https://mcp-memory.loqwai.workers.dev/user/test-user/sse';

  console.log('🔗 Connecting to MCP server via SSE:', serverUrl);

  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(serverUrl);

    eventSource.onopen = function(event) {
      console.log('✅ SSE connection opened');

      // Send initialization message
      const initMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      console.log('📤 Sending initialize message:', JSON.stringify(initMessage));
      // Note: SSE is read-only, we need to use POST for sending messages
    };

    eventSource.onmessage = function(event) {
      console.log('📥 Received message:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('📋 Parsed data:', data);
      } catch (e) {
        console.log('📄 Raw data (not JSON):', event.data);
      }
    };

    eventSource.onerror = function(event) {
      console.error('❌ SSE error:', event);
      eventSource.close();
      reject(new Error('SSE connection failed'));
    };

    // Close connection after 5 seconds
    setTimeout(() => {
      console.log('⏰ Closing SSE connection');
      eventSource.close();
      resolve();
    }, 5000);
  });
}

// Run the test
testMCPServerSSE().then(() => {
  console.log('\n✅ SSE MCP server test completed');
}).catch(error => {
  console.error('❌ SSE test failed:', error);
});
