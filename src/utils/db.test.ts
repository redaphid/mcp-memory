import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initializeDatabase, storeMemoryInD1 } from './db'

describe('initializeDatabase', () => {
  it('should exist', () => {
    expect(initializeDatabase).toBeDefined()
  })
  
  it('should be a function', () => {
    expect(typeof initializeDatabase).toBe('function')
  })
  
  describe('when called with env', () => {
    let mockEnv: any
    
    beforeEach(async () => {
      mockEnv = {
        DB: {
          exec: vi.fn(),
          prepare: vi.fn(() => ({
            all: vi.fn().mockResolvedValue({ results: [] })
          }))
        }
      }
      await initializeDatabase(mockEnv)
    })
    
    it('should call DB.exec', () => {
      expect(mockEnv.DB.exec).toHaveBeenCalled()
    })
    
    it('should create memories table', () => {
      expect(mockEnv.DB.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS memories')
      )
    })
  })
})

describe('storeMemoryInD1', () => {
  it('should exist', () => {
    expect(storeMemoryInD1).toBeDefined()
  })
  
  it('should be a function', () => {
    expect(typeof storeMemoryInD1).toBe('function')
  })
  
  describe('when storing a memory', () => {
    let mockEnv: any
    let result: string
    
    beforeEach(async () => {
      mockEnv = {
        DB: {
          prepare: vi.fn(() => ({
            bind: vi.fn().mockReturnThis(),
            run: vi.fn().mockResolvedValue({})
          }))
        }
      }
      result = await storeMemoryInD1('test content', 'user:alice', mockEnv)
    })
    
    it('should return a string', () => {
      expect(typeof result).toBe('string')
    })
    
    it('should call DB.prepare with INSERT query', () => {
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        'INSERT INTO memories (id, userId, namespace, content) VALUES (?, ?, ?, ?)'
      )
    })
  })
})