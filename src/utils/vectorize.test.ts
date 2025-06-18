import { describe, it, expect, beforeEach, vi } from 'vitest'
import { storeMemory } from './vectorize'

describe('storeMemory', () => {
  it('should exist', () => {
    expect(storeMemory).toBeDefined()
  })
  
  it('should be a function', () => {
    expect(typeof storeMemory).toBe('function')
  })
})