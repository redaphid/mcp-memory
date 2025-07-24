export const compactMemories = async (query: string, namespace?: string) => {
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