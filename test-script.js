#!/usr/bin/env node

const baseUrl = 'http://localhost:8787';

async function testEndpoint(url, options = {}) {
  const response = await fetch(`${baseUrl}${url}`, options);
  if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
  return response.json();
}

async function runTests() {
  console.log('🧪 Testing MCP Memory System...\n');

  // Test 1: Health check
  console.log('1. Health check...');
  await testEndpoint('/');
  console.log('✅ Server running\n');

  // Test 2: OpenAPI docs
  console.log('2. OpenAPI documentation...');
  const docs = await testEndpoint('/doc');
  if (!docs.openapi) throw new Error('No OpenAPI spec');
  if (!docs.paths) throw new Error('No API paths defined');
  console.log('✅ OpenAPI docs available\n');

  // Test 3: Swagger UI
  console.log('3. Swagger UI...');
  const swaggerResponse = await fetch(`${baseUrl}/ui`);
  if (!swaggerResponse.ok) throw new Error('Swagger UI not accessible');
  console.log('✅ Swagger UI accessible\n');

  // Test 4: Namespaces API
  console.log('4. Namespaces API...');
  const namespaces = await testEndpoint('/api/namespaces');
  if (!namespaces.success) throw new Error('Namespaces API failed');
  if (!namespaces.namespaces) throw new Error('No namespaces data');
  console.log('✅ Namespaces API working\n');

  // Test 5: Search API
  console.log('5. Search API...');
  const searchResult = await testEndpoint('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'test', namespaces: ['user:test'] })
  });
  if (!searchResult.success) throw new Error('Search API failed');
  if (!Array.isArray(searchResult.results)) throw new Error('Search results malformed');
  console.log('✅ Search API working\n');

  // Test 6: Memory retrieval
  console.log('6. Memory retrieval...');
  const memories = await testEndpoint('/user/test/memories');
  if (!memories.success) throw new Error('Memory retrieval failed');
  if (!Array.isArray(memories.memories)) throw new Error('Memories data malformed');
  console.log('✅ Memory retrieval working\n');

  console.log('🎉 All tests passed!\n');
  console.log('🚀 Start with: npm run dev');
  console.log('🌐 Visit: http://localhost:8787');
  console.log('📚 API docs: http://localhost:8787/ui');
}

runTests().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
