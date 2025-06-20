import { callMcpTool } from './test-utils.mjs'

async function testDebug() {
  const uniqueId = Date.now()
  const namespace = `debug-${uniqueId}`
  const testMemory = `Debug test ${uniqueId}: This is a test memory for debugging vector search`

  console.log('🔍 Debug Test for Vector Search\n')
  console.log('1. Storing new memory with unique ID:', uniqueId)
  console.log('   Content:', testMemory)

  // Store memory
  await callMcpTool(namespace, 'addToMCPMemory', { thingToRemember: testMemory }, 1)

  // Wait and search
  console.log('\n2. Waiting 3 seconds for indexing...')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  console.log('\n3. Searching for memory...')
  await callMcpTool(namespace, 'searchMCPMemory', { informationToGet: 'debug test' }, 2)

  // Check database directly
  console.log('\n4. Checking database directly...')
  const dbMemories = await fetch(`https://mcp-memory.loqwai.workers.dev/user/${namespace}/memories`)
  const dbData = await dbMemories.json()
  console.log('   Memories in DB:', dbData.pagination?.total || 0)
  if (dbData.memories?.length > 0) {
    console.log('   First memory:', dbData.memories[0])
  }

  // Try exact search
  console.log('\n5. Trying exact content search...')
  await callMcpTool(namespace, 'searchMCPMemory', { informationToGet: testMemory }, 3)
}

testDebug().catch(console.error)
