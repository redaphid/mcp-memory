import { callMcp } from './test-utils.js'
const BASE_URL = 'https://mcp-memory.loqwai.workers.dev'

async function testDirect() {
  console.log('Testing direct memory operations...\n')

  // Get all memories for user:integration-test
  console.log('1. Getting all memories for user:integration-test...')
  const allMemories = await fetch(`${BASE_URL}/user/integration-test/memories`)
  const memoriesData = await allMemories.json()
  console.log('   Success:', memoriesData.success)
  console.log('   Total memories:', memoriesData.pagination?.total || 0)
  console.log('   Memories:', memoriesData.memories?.length || 0)

  if (memoriesData.memories?.length > 0) {
    console.log('\n   Recent memories:')
    memoriesData.memories.slice(0, 3).forEach(m => {
      console.log(`   - ${m.content.substring(0, 60)}... (${m.id})`)
    })
  }

  // Test simple memory addition via test endpoint
  console.log('\n2. Adding simple test memory...')
  const simpleTest = await fetch(`${BASE_URL}/api/simple-test`, {
    method: 'POST'
  })
  const simpleResult = await simpleTest.json()
  console.log('   Success:', simpleResult.success)
  console.log('   Memory ID:', simpleResult.memoryId)

  // Check database info
  console.log('\n3. Checking database state...')
  const dbInfo = await fetch(`${BASE_URL}/api/db-info`)
  const dbData = await dbInfo.json()
  console.log('   Total memories in DB:', dbData.count)
  console.log('   Sample memories:')
  if (dbData.sample) {
    dbData.sample.forEach(m => {
      console.log(`   - ${m.namespace}: ${m.content?.substring(0, 40)}...`)
    })
  }

  // Test listing available tools
  console.log('\n4. Testing MCP tools listing...')
  const toolsData = await callMcp('integration-test', 'tools/list', undefined, 1)

  console.log('   Available tools:', toolsData.result?.tools?.length || 0)
  if (toolsData.result?.tools) {
    toolsData.result.tools.forEach((tool) => {
      console.log(`   - ${tool.name}`)
    })
  }
}

testDirect().catch(console.error)
