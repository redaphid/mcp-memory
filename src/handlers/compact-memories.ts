export const compactMemories = async (query: string) => {
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