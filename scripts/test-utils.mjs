const BASE_URL = 'https://mcp-memory.loqwai.workers.dev'

export async function callMcpTool(namespace, toolName, toolArgs, id = 1) {
  const url = `${BASE_URL}/user/${namespace}/sse`
  const body = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: toolArgs
    },
    id
  }

  console.log(`\n📞 Calling tool "${toolName}" in namespace "${namespace}"...`)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const responseData = await response.json()
  console.log('   Response:', JSON.stringify(responseData, null, 2))
  return responseData
}

export async function callMcp(namespace, method, params, id = 1) {
  const url = `${BASE_URL}/user/${namespace}/sse`
  const body = {
    jsonrpc: '2.0',
    method,
    params,
    id
  }

  console.log(`\n📞 Calling method "${method}" in namespace "${namespace}"...`)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const responseData = await response.json()
  console.log('   Response:', JSON.stringify(responseData, null, 2))
  return responseData
}
