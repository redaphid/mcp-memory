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
    
    console.log(`Vector stored successfully for memory ${memoryId} in namespace ${userId}`)
    
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
  env: Env
) {
  try {
    const queryVector = await generateEmbeddings(query, env)
    const results = await env.VECTORIZE.query(queryVector, {
      namespace: userId,
      topK: 10,
      returnMetadata: "all",
    })

    console.log(`Vector search in namespace ${userId} returned ${results.matches?.length || 0} matches`)

    if (!results.matches || results.matches.length === 0) return []

    return results.matches
      .filter(match => match.score > MINIMUM_SIMILARITY_SCORE)
      .map(match => ({
        content: match.metadata?.content || `Missing memory content (ID: ${match.id})`,
        score: match.score || 0,
        id: match.id,
      }))
      .sort((a, b) => b.score - a.score)
  } catch (error) {
    console.error(`Vector search failed for namespace ${userId}:`, error)
    return []
  }
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

  console.log(`Vector for memory ${memoryId} (namespace ${userId}) updated.`)
}

export async function deleteVectorById(memoryId: string, userId: string, env: Env) {
  const result = await env.VECTORIZE.deleteByIds([memoryId])
  console.log(
    `Attempted global deletion for vector ID ${memoryId}. Deletion was requested for user (namespace): ${userId} Result:`,
    result
  )
}
