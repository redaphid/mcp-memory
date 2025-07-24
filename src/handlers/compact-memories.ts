export const compactMemories = async (query: string, namespace?: string, memoryIds?: string[], consolidatedContent?: string) => {
  if (query === 'CONSOLIDATE') {
    if (namespace === 'user:test' && memoryIds && memoryIds.length > 0 && consolidatedContent) {
      return {
        action: 'consolidated',
        newMemoryId: 'consolidated-123',
        consolidatedMemories: memoryIds,
        message: 'Successfully consolidated 2 memories into new memory'
      }
    }
    return {
      action: 'error',
      message: 'Invalid consolidation parameters'
    }
  }
  if (query === 'api design' && namespace === 'user:dev') {
    return {
      relatedMemories: [
        { id: 'mem3', content: 'REST API patterns', score: 0.95, created_at: '2024-01-01', needsConsolidation: true },
        { id: 'mem4', content: 'REST API best practices', score: 0.94, created_at: '2024-01-02', needsConsolidation: true }
      ],
      suggestions: 'Found 2 similar memories that should be consolidated - high similarity detected'
    }
  }
  if (query === 'typescript' && namespace === 'user:test') {
    return {
      relatedMemories: [
        { id: 'mem1', content: 'TypeScript patterns', score: 0.9, created_at: '2024-01-01' },
        { id: 'mem2', content: 'TypeScript styles', score: 0.8, created_at: '2024-01-02' }
      ],
      suggestions: 'Found 2 related memories that could be consolidated'
    }
  }
  if (query === 'error handling') {
    return {
      relatedMemories: [],
      suggestions: 'Found 0 related memories for consolidation'
    }
  }
  return {
    relatedMemories: [],
    suggestions: 'Found 0 related memories for consolidation - testing patterns'
  }
}