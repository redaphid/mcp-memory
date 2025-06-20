const BASE_URL = 'https://mcp-memory.loqwai.workers.dev'

async function testVectorDebug() {
  console.log('🔍 Testing Vector Operations Directly\n')
  
  console.log('1. Testing vector storage and search...')
  const response = await fetch(`${BASE_URL}/api/debug-vector`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'This is a test of the vector storage system',
      namespace: 'test-debug'
    })
  })
  
  const data = await response.json()
  console.log('\nResponse:', JSON.stringify(data, null, 2))
  
  if (data.success) {
    console.log('\n✅ Vector operations working!')
    console.log('   - Embedding generated:', data.embeddingLength, 'dimensions')
    console.log('   - Vector stored with ID:', data.vectorId)
    console.log('   - Search found:', data.searchResults.count, 'matches')
    
    if (data.searchResults.matches?.length > 0) {
      console.log('\n   Matches:')
      data.searchResults.matches.forEach(m => {
        console.log(`   - ${m.id}: ${m.content} (score: ${m.score})`)
      })
    }
  } else {
    console.log('\n❌ Vector operations failed!')
    console.log('   Error:', data.error)
    console.log('   Details:', data.details)
  }
}

testVectorDebug().catch(console.error)