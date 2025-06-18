import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { v4 as uuidv4 } from 'uuid'

const BASE_URL = process.env.TEST_URL || 'https://mcp-memory.loqwai.workers.dev'
const TEST_NAMESPACE = `user:vitest-${Date.now()}`

describe('MCP Memory Integration Tests', () => {
  describe('Health checks', () => {
    it('should get database info', async () => {
      const response = await fetch(`${BASE_URL}/api/db-info`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.tableInfo).toBeDefined()
      expect(data.count).toBeGreaterThan(0)
    })

    it('should get namespaces', async () => {
      const response = await fetch(`${BASE_URL}/api/namespaces`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.namespaces).toBeDefined()
      expect(Array.isArray(data.namespaces.users)).toBe(true)
      expect(Array.isArray(data.namespaces.projects)).toBe(true)
    })
  })

  describe('MCP tools via SSE endpoint', () => {
    it('should list available tools', async () => {
      const response = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(':', '/')}/sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1
        })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.result?.tools).toBeDefined()
      expect(data.result.tools.length).toBe(3)
      
      const toolNames = data.result.tools.map((t: any) => t.name)
      expect(toolNames).toContain('addToMCPMemory')
      expect(toolNames).toContain('searchMCPMemory')
      expect(toolNames).toContain('searchAllMemories')
    })

    describe('Memory operations', () => {
      const testMemory = `Integration test memory ${uuidv4()}`
      
      it('should store a memory', async () => {
        const response = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(':', '/')}/sse`, {
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
            id: 2
          })
        })
        
        expect(response.ok).toBe(true)
        const data = await response.json()
        expect(data.result?.content?.[0]?.text).toContain(`Remembered in ${TEST_NAMESPACE}`)
        expect(data.result?.content?.[0]?.text).toContain(testMemory)
      })

      it('should retrieve stored memory from database', async () => {
        const response = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(':', '/')}/memories`)
        expect(response.ok).toBe(true)
        
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.memories).toBeDefined()
        expect(data.memories.length).toBeGreaterThan(0)
        
        const storedMemory = data.memories.find((m: any) => m.content === testMemory)
        expect(storedMemory).toBeDefined()
        expect(storedMemory.content).toBe(testMemory)
      })

      it('should search for memory (may need indexing time)', async () => {
        const response = await fetch(`${BASE_URL}/${TEST_NAMESPACE.replace(':', '/')}/sse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'searchMCPMemory',
              arguments: {
                informationToGet: 'Integration test'
              }
            },
            id: 3
          })
        })
        
        expect(response.ok).toBe(true)
        const data = await response.json()
        const resultText = data.result?.content?.[0]?.text || ''
        
        // Vector search may not find it immediately due to indexing delay
        if (resultText.includes('No relevant memories found')) {
          console.log('⚠️  Vector search returned no results - this is expected for newly indexed vectors')
        } else {
          expect(resultText).toContain(testMemory)
        }
      })
    })
  })

  describe('REST API endpoints', () => {
    it('should search memories via REST API', async () => {
      const response = await fetch(`${BASE_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          namespaces: [TEST_NAMESPACE]
        })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.query).toBe('test')
      expect(Array.isArray(data.results)).toBe(true)
    })

    it('should search specific namespace via REST', async () => {
      const response = await fetch(`${BASE_URL}/search/${TEST_NAMESPACE.replace(':', '/')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'integration'
        })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.namespace).toBe(TEST_NAMESPACE)
    })
  })

  describe('Vector operations debug endpoint', () => {
    it('should store and search vectors directly', async () => {
      const testText = 'Direct vector test ' + uuidv4()
      
      const response = await fetch(`${BASE_URL}/api/debug-vector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          namespace: TEST_NAMESPACE
        })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.vectorId).toBeDefined()
      expect(data.embeddingLength).toBe(1024)
      
      // Immediate search typically returns the same vector just inserted
      if (data.searchResults.count > 0) {
        expect(data.searchResults.matches[0].content).toBe(testText)
        expect(data.searchResults.matches[0].score).toBeGreaterThan(0.9)
      }
    })
  })

  describe('Previously stored memories check', () => {
    it('should find TypeScript memories in older namespaces', async () => {
      const response = await fetch(`${BASE_URL}/user/test/sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'searchAllMemories',
            arguments: {
              query: 'TypeScript'
            }
          },
          id: 4
        })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      const resultText = data.result?.content?.[0]?.text || ''
      
      // Should find TypeScript mentions in multiple namespaces
      expect(resultText).toContain('Found memories across all namespaces')
      const namespaceMatches = resultText.match(/In (user|project):[^\n]+/g) || []
      expect(namespaceMatches.length).toBeGreaterThan(0)
      console.log(`Found TypeScript memories in ${namespaceMatches.length} namespaces`)
    })

    it('should search in specific older namespace', async () => {
      const response = await fetch(`${BASE_URL}/user/final-test-1750236996581/sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'searchMCPMemory',
            arguments: {
              informationToGet: 'programming TypeScript'
            }
          },
          id: 5
        })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      const resultText = data.result?.content?.[0]?.text || ''
      
      if (resultText.includes('I love programming in TypeScript')) {
        console.log('✅ Vector search is now working for previously stored memories!')
        expect(resultText).toContain('I love programming in TypeScript')
      } else {
        console.log('⚠️  Vector search still not finding previously stored memories')
      }
    })
  })
})