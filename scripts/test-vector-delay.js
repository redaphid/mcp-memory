const BASE_URL = 'https://mcp-memory.loqwai.workers.dev'

async function testVectorWithDelay() {
  console.log('🔍 Testing Vector Search with Delay\n')
  
  const namespace = `test-${Date.now()}`
  const texts = [
    'The quick brown fox jumps over the lazy dog',
    'Machine learning is transforming how we process information',
    'Cloudflare Workers provide edge computing capabilities'
  ]
  
  // Store multiple vectors
  console.log('1. Storing multiple test vectors...')
  for (let i = 0; i < texts.length; i++) {
    const response = await fetch(`${BASE_URL}/api/debug-vector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: texts[i],
        namespace
      })
    })
    
    const data = await response.json()
    console.log(`   Stored vector ${i+1}: ${data.success ? '✅' : '❌'} (${data.vectorId})`)
  }
  
  // Test immediate search
  console.log('\n2. Testing immediate search...')
  const immediateSearch = await fetch(`${BASE_URL}/api/debug-vector`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'fox jumps',
      namespace
    })
  })
  
  const immediateData = await immediateSearch.json()
  console.log(`   Immediate search found: ${immediateData.searchResults.count} matches`)
  
  // Wait and search again
  console.log('\n3. Waiting 5 seconds for indexing...')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  console.log('\n4. Testing delayed search...')
  const delayedSearch = await fetch(`${BASE_URL}/api/debug-vector`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'machine learning information',
      namespace
    })
  })
  
  const delayedData = await delayedSearch.json()
  console.log(`   Delayed search found: ${delayedData.searchResults.count} matches`)
  
  if (delayedData.searchResults.matches?.length > 0) {
    console.log('\n   Top matches:')
    delayedData.searchResults.matches.slice(0, 3).forEach(m => {
      console.log(`   - Score ${m.score.toFixed(4)}: ${m.content}`)
    })
  }
  
  // Test similarity threshold
  console.log('\n5. Testing with exact match...')
  const exactSearch = await fetch(`${BASE_URL}/api/debug-vector`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: texts[1], // Exact match
      namespace
    })
  })
  
  const exactData = await exactSearch.json()
  console.log(`   Exact match search found: ${exactData.searchResults.count} matches`)
  if (exactData.searchResults.matches?.length > 0) {
    console.log(`   Best score: ${exactData.searchResults.matches[0].score}`)
  }
}

testVectorWithDelay().catch(console.error)