const BASE_URL = 'https://mcp-memory.loqwai.workers.dev'

async function testDebug() {
  const uniqueId = Date.now()
  const testMemory = `Debug test ${uniqueId}: This is a test memory for debugging vector search`
  
  console.log('🔍 Debug Test for Vector Search\n')
  console.log('1. Storing new memory with unique ID:', uniqueId)
  console.log('   Content:', testMemory)
  
  // Store memory
  const storeResponse = await fetch(`${BASE_URL}/user/debug-${uniqueId}/sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'addToMCPMemory',
        arguments: {
          thingToRemember: testMemory
        }
      },
      id: 1
    })
  })
  
  const storeData = await storeResponse.json()
  console.log('\n   Store response:', JSON.stringify(storeData, null, 2))
  
  // Wait and search
  console.log('\n2. Waiting 3 seconds for indexing...')
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  console.log('\n3. Searching for memory...')
  const searchResponse = await fetch(`${BASE_URL}/user/debug-${uniqueId}/sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'searchMCPMemory',
        arguments: {
          informationToGet: 'debug test'
        }
      },
      id: 2
    })
  })
  
  const searchData = await searchResponse.json()
  console.log('\n   Search response:', JSON.stringify(searchData, null, 2))
  
  // Check database directly
  console.log('\n4. Checking database directly...')
  const dbMemories = await fetch(`${BASE_URL}/user/debug-${uniqueId}/memories`)
  const dbData = await dbMemories.json()
  console.log('   Memories in DB:', dbData.pagination?.total || 0)
  if (dbData.memories?.length > 0) {
    console.log('   First memory:', dbData.memories[0])
  }
  
  // Try exact search
  console.log('\n5. Trying exact content search...')
  const exactSearch = await fetch(`${BASE_URL}/user/debug-${uniqueId}/sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'searchMCPMemory',
        arguments: {
          informationToGet: testMemory
        }
      },
      id: 3
    })
  })
  
  const exactData = await exactSearch.json()
  console.log('\n   Exact search response:', JSON.stringify(exactData, null, 2))
}

testDebug().catch(console.error)