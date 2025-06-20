import { callMcpTool } from './test-utils.mjs'
const BASE_URL = 'https://mcp-memory.loqwai.workers.dev'

async function test() {
  console.log('Testing deployed MCP Memory service...\n')

  // Test 1: Database info
  console.log('1. Testing database info endpoint...')
  try {
    const dbInfo = await fetch(`${BASE_URL}/api/db-info`)
    const dbData = await dbInfo.json()
    console.log('✅ Database info:', dbData.success ? 'SUCCESS' : 'FAILED')
    console.log('   Table count:', dbData.count)
  } catch (e) {
    console.log('❌ Database info failed:', e.message)
  }

  // Test 2: Create test data
  console.log('\n2. Creating test data...')
  try {
    const testData = await fetch(`${BASE_URL}/api/test-data`, {
      method: 'POST'
    })
    const testResult = await testData.json()
    console.log('✅ Test data created:', testResult.success ? 'SUCCESS' : 'FAILED')
  } catch (e) {
    console.log('❌ Test data creation failed:', e.message)
  }

  // Test 3: Get namespaces
  console.log('\n3. Getting namespaces...')
  try {
    const namespaces = await fetch(`${BASE_URL}/api/namespaces`)
    const nsData = await namespaces.json()
    console.log('✅ Namespaces retrieved:', nsData.success ? 'SUCCESS' : 'FAILED')
    console.log('   Users:', nsData.namespaces?.users?.length || 0)
    console.log('   Projects:', nsData.namespaces?.projects?.length || 0)
  } catch (e) {
    console.log('❌ Namespaces failed:', e.message)
  }

  // Test 4: Store memory via MCP
  console.log('\n4. Testing MCP memory storage...')
  try {
    const storeData = await callMcpTool(
      'test',
      'addToMCPMemory',
      {
        thingToRemember: 'Integration test memory at ' + new Date().toISOString()
      },
      1
    )
    console.log('✅ MCP store:', storeData.result ? 'SUCCESS' : 'FAILED')
    if (storeData.result?.content?.[0]?.text) {
      console.log('   Result:', storeData.result.content[0].text)
    }
  } catch (e) {
    console.log('❌ MCP store failed:', e.message)
  }

  // Test 5: Search memory via MCP
  console.log('\n5. Testing MCP memory search...')
  try {
    // Wait a bit for indexing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const searchData = await callMcpTool(
      'test',
      'searchMCPMemory',
      {
        informationToGet: 'Integration test'
      },
      2
    )
    console.log('✅ MCP search:', searchData.result ? 'SUCCESS' : 'FAILED')
    if (searchData.result?.content?.[0]?.text) {
      console.log('   Found:', searchData.result.content[0].text.split('\n').slice(0, 3).join('\n'))
    }
  } catch (e) {
    console.log('❌ MCP search failed:', e.message)
  }

  // Test 6: REST API search
  console.log('\n6. Testing REST API search...')
  try {
    const apiSearch = await fetch(`${BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'test',
        namespaces: ['user:test', 'user:alice', 'project:frontend']
      })
    })
    const searchResults = await apiSearch.json()
    console.log('✅ REST search:', searchResults.success ? 'SUCCESS' : 'FAILED')
    console.log('   Results found:', searchResults.results?.length || 0)
  } catch (e) {
    console.log('❌ REST search failed:', e.message)
  }

  // Test 7: Search all memories
  console.log('\n7. Testing search all memories...')
  try {
    const allData = await callMcpTool(
      'test',
      'searchAllMemories',
      {
        query: 'user'
      },
      3
    )
    console.log('✅ Search all:', allData.result ? 'SUCCESS' : 'FAILED')
    if (allData.result?.content?.[0]?.text) {
      const lines = allData.result.content[0].text.split('\n')
      console.log('   Found memories in', lines.filter((l) => l.startsWith('In ')).length, 'namespaces')
    }
  } catch (e) {
    console.log('❌ Search all failed:', e.message)
  }

  console.log('\n✨ Testing complete!')
}

test().catch(console.error)
