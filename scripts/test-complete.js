const BASE_URL = 'https://mcp-memory.loqwai.workers.dev'

async function testWithRetry() {
  const testMemory = `Test memory from integration test - ${Date.now()}`
  console.log('🚀 Starting comprehensive test...\n')
  
  // Store a unique memory
  console.log('1. Storing unique test memory...')
  console.log('   Content:', testMemory)
  
  const storeResponse = await fetch(`${BASE_URL}/user/integration-test/sse`, {
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
  console.log('   Store result:', storeData.result?.content?.[0]?.text || 'FAILED')
  
  // Try searching with retries
  console.log('\n2. Searching for stored memory (with retries)...')
  
  for (let i = 0; i < 5; i++) {
    console.log(`   Attempt ${i + 1}/5...`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const searchResponse = await fetch(`${BASE_URL}/user/integration-test/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'searchMCPMemory',
          arguments: {
            informationToGet: 'integration test'
          }
        },
        id: 2
      })
    })
    
    const searchData = await searchResponse.json()
    const resultText = searchData.result?.content?.[0]?.text || ''
    
    if (resultText.includes(testMemory)) {
      console.log('   ✅ FOUND! Memory successfully retrieved')
      console.log('   ', resultText.split('\n')[1])
      break
    } else if (resultText.includes('No relevant memories')) {
      console.log('   ⏳ Not found yet, waiting for indexing...')
    } else {
      console.log('   Result:', resultText.split('\n').slice(0, 2).join('\n'))
    }
  }
  
  // Test cross-namespace search
  console.log('\n3. Testing cross-namespace search...')
  const allSearchResponse = await fetch(`${BASE_URL}/user/integration-test/sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'searchAllMemories',
        arguments: {
          query: 'integration'
        }
      },
      id: 3
    })
  })
  
  const allSearchData = await allSearchResponse.json()
  const allResultText = allSearchData.result?.content?.[0]?.text || ''
  
  if (allResultText.includes('user:integration-test')) {
    console.log('   ✅ Found in cross-namespace search!')
    const lines = allResultText.split('\n')
    const ourNamespace = lines.findIndex(l => l.includes('user:integration-test'))
    if (ourNamespace >= 0) {
      console.log('   ', lines.slice(ourNamespace, ourNamespace + 3).join('\n    '))
    }
  } else {
    console.log('   ❌ Not found in cross-namespace search')
  }
  
  // Test REST API
  console.log('\n4. Testing REST API search...')
  const restSearch = await fetch(`${BASE_URL}/search/user/integration-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'integration test'
    })
  })
  
  const restData = await restSearch.json()
  console.log('   Success:', restData.success)
  console.log('   Memories found:', restData.memories?.length || 0)
  if (restData.memories?.length > 0) {
    console.log('   First result:', restData.memories[0].content)
  }
  
  console.log('\n✨ Test complete!')
}

testWithRetry().catch(console.error)