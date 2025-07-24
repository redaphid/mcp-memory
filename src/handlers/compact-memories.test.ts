import { describe, it, expect } from 'vitest'
import { compactMemories } from './compact-memories'

describe('compactMemories', () => {
  it('should exist', () => {
    expect(compactMemories).toBeDefined()
  })

  it('should be a function', () => {
    expect(typeof compactMemories).toBe('function')
  })

  describe('when called with "error handling"', () => {
    let result
    beforeEach(async () => {
      result = await compactMemories('error handling')
    })

    it('should return analysis of related memories', () => {
      expect(result).toEqual({
        relatedMemories: [],
        suggestions: 'Found 0 related memories for consolidation'
      })
    })
  })

  describe('when called with "testing patterns"', () => {
    let result
    beforeEach(async () => {
      result = await compactMemories('testing patterns')
    })

    it('should return different analysis', () => {
      expect(result).toEqual({
        relatedMemories: [],
        suggestions: 'Found 0 related memories for consolidation - testing patterns'
      })
    })
  })

  describe('when called with "typescript" and namespace', () => {
    let result
    beforeEach(async () => {
      result = await compactMemories('typescript', 'user:test')
    })

    it('should return memories that need compacting', () => {
      expect(result).toEqual({
        relatedMemories: [
          { id: 'mem1', content: 'TypeScript patterns', score: 0.9, created_at: '2024-01-01' },
          { id: 'mem2', content: 'TypeScript styles', score: 0.8, created_at: '2024-01-02' }
        ],
        suggestions: 'Found 2 related memories that could be consolidated'
      })
    })
  })

  describe('when memories have high similarity', () => {
    let result
    beforeEach(async () => {
      result = await compactMemories('api design', 'user:dev')
    })

    it('should detect duplicate content needing consolidation', () => {
      expect(result).toEqual({
        relatedMemories: [
          { id: 'mem3', content: 'REST API patterns', score: 0.95, created_at: '2024-01-01', needsConsolidation: true },
          { id: 'mem4', content: 'REST API best practices', score: 0.94, created_at: '2024-01-02', needsConsolidation: true }
        ],
        suggestions: 'Found 2 similar memories that should be consolidated - high similarity detected'
      })
    })
  })

  describe('when performing consolidation', () => {
    let result
    beforeEach(async () => {
      result = await compactMemories('CONSOLIDATE', 'user:test', ['mem1', 'mem2'], 'Combined TypeScript patterns and styles')
    })

    it('should return consolidation result', () => {
      expect(result).toEqual({
        action: 'consolidated',
        newMemoryId: 'consolidated-123',
        consolidatedMemories: ['mem1', 'mem2'],
        message: 'Successfully consolidated 2 memories into new memory'
      })
    })
  })

  describe('when consolidation fails', () => {
    let result
    beforeEach(async () => {
      result = await compactMemories('CONSOLIDATE', 'user:invalid', [], '')
    })

    it('should return error', () => {
      expect(result).toEqual({
        action: 'error',
        message: 'Invalid consolidation parameters'
      })
    })
  })
})