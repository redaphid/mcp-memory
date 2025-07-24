import { v4 as uuidv4 } from "uuid"

const MINIMUM_SIMILARITY_SCORE = 0.3

async function generateEmbeddings(text: string, env: Env) {
  const embeddings = await env.AI.run("@cf/baai/bge-m3", { text }) as AiTextEmbeddingsOutput
  const values = embeddings.data[0]
  if (!values) throw new Error("Failed to generate vector embedding")
  return values
}

export async function storeMemory(text: string, userId: string, env: Env) {
  const memoryId = uuidv4()
  
  try {
    const values = await generateEmbeddings(text, env)
    
    await env.VECTORIZE.upsert([
      {
        id: memoryId,
        values,
        namespace: userId,
        metadata: { content: text },
      },
    ])
    
    
    // Mark as synced in D1
    try {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO vector_sync (memory_id, synced_at) VALUES (?, ?)"
      ).bind(memoryId, new Date().toISOString()).run()
    } catch (dbError) {
      console.error(`Failed to mark vector as synced: ${dbError}`)
    }
  } catch (error) {
    console.error(`Failed to store vector for memory ${memoryId}:`, error)
    // Don't throw - let the memory still be stored in D1
  }

  return memoryId
}

export async function searchMemories(
  query: string,
  userId: string,
  env: Env,
  options: {
    limit?: number
    includeSuperseded?: boolean
    sortBy?: "relevance" | "newest" | "oldest"
  } = {}
) {
  const { limit = 10, includeSuperseded = false, sortBy = "relevance" } = options
  
  try {
    const queryVector = await generateEmbeddings(query, env)
    const results = await env.VECTORIZE.query(queryVector, {
      namespace: userId,
      topK: Math.min(limit * 2, 100), // Get more results to filter superseded
      returnMetadata: "all",
    })

    if (!results.matches || results.matches.length === 0) return []

    // Get memory metadata from D1 to check superseded status and timestamps
    const memoryIds = results.matches.map(match => match.id)
    const memoryMetadata = await getMemoryMetadataFromD1(memoryIds, userId, env)
    const metadataMap = new Map(memoryMetadata.map(m => [m.id, m]))

    let filteredResults = results.matches
      .filter(match => match.score > MINIMUM_SIMILARITY_SCORE)
      .map(match => {
        const metadata = metadataMap.get(match.id)
        return {
          content: match.metadata?.content || `Missing memory content (ID: ${match.id})`,
          score: match.score || 0,
          id: match.id,
          created_at: metadata?.created_at,
          superseded_by: metadata?.superseded_by,
          consolidates: metadata?.consolidates,
          consolidation_date: metadata?.consolidation_date
        }
      })

    // Filter out superseded memories unless specifically requested
    if (!includeSuperseded) {
      filteredResults = filteredResults.filter(result => !result.superseded_by)
    }

    // Apply sorting
    if (sortBy === "newest") {
      filteredResults.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    } else if (sortBy === "oldest") {
      filteredResults.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
    } else {
      // Default to relevance (score)
      filteredResults.sort((a, b) => b.score - a.score)
    }

    return filteredResults.slice(0, limit)
  } catch (error) {
    console.error(`Vector search failed for namespace ${userId}:`, error)
    return []
  }
}

async function getMemoryMetadataFromD1(memoryIds: string[], namespace: string, env: Env) {
  if (memoryIds.length === 0) return []
  
  const placeholders = memoryIds.map(() => '?').join(',')
  const query = `SELECT id, created_at, superseded_by, consolidates, consolidation_date 
                 FROM memories 
                 WHERE id IN (${placeholders}) AND namespace = ? AND deleted_at IS NULL`
  
  const stmt = env.DB.prepare(query)
  const result = await stmt.bind(...memoryIds, namespace).all()
  
  return result.results as Array<{
    id: string
    created_at: string
    superseded_by: string | null
    consolidates: string | null
    consolidation_date: string | null
  }>
}

export async function updateMemoryVector(
  memoryId: string,
  newContent: string,
  userId: string,
  env: Env
) {
  const newValues = await generateEmbeddings(newContent, env)
  
  await env.VECTORIZE.upsert([
    {
      id: memoryId,
      values: newValues,
      namespace: userId,
      metadata: { content: newContent },
    },
  ])

}

export async function deleteVectorById(memoryId: string, userId: string, env: Env) {
  const result = await env.VECTORIZE.deleteByIds([memoryId])
}
