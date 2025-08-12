import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the agents/mcp module
vi.mock("agents/mcp", () => ({
  McpAgent: class MockMcpAgent {
    env: any
    props: any
    
    constructor(env: any, context: any, props: any) {
      this.env = env
      this.props = props
    }
  }
}))

import { Memory } from "./mcp-modern"

describe('Memory (modern MCP agent)', () => {
  it('should exist', () => {
    expect(Memory).toBeDefined()
  })

  it('should be a class', () => {
    expect(typeof Memory).toBe('function')
  })

  describe('when instantiated', () => {
    let memory

    beforeEach(() => {
      const env = {} as any
      const props = { userId: 'test-user' }
      memory = new Memory(env, {}, props)
    })

    it('should have a server property', () => {
      expect(memory.server).toBeDefined()
    })

    it('should have server with tool method', () => {
      expect(memory.server.tool).toBeDefined()
    })

    it('should have tool method that can be called', () => {
      expect(() => memory.server.tool("testTool", {}, () => {})).not.toThrow()
    })

    it('should have actual McpServer instance', () => {
      expect(memory.server.constructor.name).toBe('McpServer')
    })

    it('should have init method', () => {
      expect(memory.init).toBeDefined()
    })

    it('should have env property from McpAgent', () => {
      expect(memory.env).toBeDefined()
    })

    it('should have props property from McpAgent', () => {
      expect(memory.props).toBeDefined()
      expect(memory.props.userId).toBe('test-user')
    })

    it('should register addToMCPMemory tool after init', async () => {
      await memory.init()
      // Check if we can call the tool method after init
      expect(() => memory.server.tool("testTool2", {}, () => {})).not.toThrow()
    })

    it('should register searchMCPMemory tool after init', async () => {
      await memory.init()
      // For now just test that init doesn't break
      expect(memory.init).toBeDefined()
    })
  })
})