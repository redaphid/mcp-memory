import { callMcpTool } from './test-utils.js'

async function testFinal() {
  const testId = Date.now()
  const namespace = `final-test-${testId}`

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
    await callMcpTool(namespace, 'addToMCPMemory', { thingToRemember: memory }, Math.random())
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
    const data = await callMcpTool(namespace, 'searchMCPMemory', { informationToGet: query }, Math.random())
    const text = data.result?.content?.[0]?.text || ''
    const found = text.includes(expected)
    console.log(`   ${found ? '✅' : '❌'} Query "${query}": ${found ? 'Found' : 'Not found'} "${expected}"`)
    if (!found && !text.includes('No relevant')) {
      console.log(`      Response: ${text.substring(0, 100)}...`)
    }
  }

  // Test cross-namespace search
  console.log('\n3. Testing cross-namespace search...')
  const allData = await callMcpTool(namespace, 'searchAllMemories', { query: 'TypeScript' }, Math.random())
  const allText = allData.result?.content?.[0]?.text || ''
  const foundInAll = allText.includes(`user:${namespace}`)
  console.log(`   ${foundInAll ? '✅' : '❌'} Found in namespace user:${namespace}: ${foundInAll}`)

  console.log('\n✨ Test complete!')
}

testFinal().catch(console.error)
