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
})