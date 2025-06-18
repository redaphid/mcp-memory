const BASE_URL = 'https://mcp-memory.loqwai.workers.dev'

async function testFinal() {
  const testId = Date.now()
  const namespace = `user:final-test-${testId}`
  
  console.log('🎯 Final Integration Test\n')
  
  // Store memories
  console.log('1. Storing test memories via MCP...')
  const memories = [
    'I love programming in TypeScript',
    'My favorite color is blue',
    'I work on distributed systems',
    'Testing vector search functionality'
  ]
  
  for (const memory of memories) {
    const response = await fetch(`${BASE_URL}/${namespace.replace(':', '/')}/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'addToMCPMemory',
          arguments: { thingToRemember: memory }
        },
        id: Math.random()
      })
    })
    
    const data = await response.json()
    console.log(`   ✅ Stored: "${memory}"`)
  }
  
  // Search for memories
  console.log('\n2. Searching for memories...')
  const searches = [
    { query: 'programming', expected: 'TypeScript' },
    { query: 'color', expected: 'blue' },
    { query: 'distributed', expected: 'systems' },
    { query: 'vector', expected: 'vector search' }
  ]
  
  for (const { query, expected } of searches) {
    const response = await fetch(`${BASE_URL}/${namespace.replace(':', '/')}/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'searchMCPMemory',
          arguments: { informationToGet: query }
        },
        id: Math.random()
      })
    })
    
    const data = await response.json()
    const text = data.result?.content?.[0]?.text || ''
    const found = text.includes(expected)
    console.log(`   ${found ? '✅' : '❌'} Query "${query}": ${found ? 'Found' : 'Not found'} "${expected}"`)
    if (!found && !text.includes('No relevant')) {
      console.log(`      Response: ${text.substring(0, 100)}...`)
    }
  }
  
  // Test cross-namespace search
  console.log('\n3. Testing cross-namespace search...')
  const allSearch = await fetch(`${BASE_URL}/${namespace.replace(':', '/')}/sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'searchAllMemories',
        arguments: { query: 'TypeScript' }
      },
      id: Math.random()
    })
  })
  
  const allData = await allSearch.json()
  const allText = allData.result?.content?.[0]?.text || ''
  const foundInAll = allText.includes(namespace)
  console.log(`   ${foundInAll ? '✅' : '❌'} Found in namespace ${namespace}: ${foundInAll}`)
  
  console.log('\n✨ Test complete!')
}

testFinal().catch(console.error)