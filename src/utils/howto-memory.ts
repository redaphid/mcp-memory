import { Procedure, Step } from "../types/procedure"
import { storeMemoryInD1 } from "./db"
import { categorizeMemory } from "./auto-categorize"

const PROCEDURE_NAMESPACE = "system:procedures"

export const rememberHowTo = async (
    title: string,
    steps: Step[],
    env: Env,
    metadata?: {
        description?: string
        category?: string
        tags?: string[]
        prerequisites?: string[]
        successCriteria?: string
        troubleshooting?: Record<string, string>
    }
): Promise<{ id: string; howto: Procedure }> => {
    const procedure: Procedure = {
        id: `proc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title,
        description: metadata?.description || "",
        category: metadata?.category || "general",
        tags: metadata?.tags || [],
        prerequisites: metadata?.prerequisites,
        steps: steps.sort((a, b) => a.order - b.order),
        createdAt: new Date().toISOString(),
        successCriteria: metadata?.successCriteria,
        troubleshooting: metadata?.troubleshooting
    }
    
    // Create searchable content from procedure
    const searchableContent = createSearchableContent(procedure)
    
    // Auto-categorize if not provided
    if (!metadata?.category || !metadata?.tags?.length) {
        const categorization = await categorizeMemory(searchableContent, env)
        procedure.category = metadata?.category || categorization.category
        procedure.tags = [...new Set([...procedure.tags, ...categorization.tags])]
    }
    
    // Store in D1
    await env.DB.prepare(
        "INSERT INTO memories (id, content, namespace, created_at) VALUES (?, ?, ?, ?)"
    ).bind(
        procedure.id,
        JSON.stringify(procedure),
        PROCEDURE_NAMESPACE,
        procedure.createdAt
    ).run()
    
    // Store in Vectorize for semantic search
    const embeddings = (await env.AI.run("@cf/baai/bge-m3", { text: searchableContent })) as any
    const values = embeddings.data[0]
    
    await env.VECTORIZE.upsert([
        {
            id: procedure.id,
            values,
            namespace: PROCEDURE_NAMESPACE,
            metadata: {
                type: "procedure",
                title: procedure.title,
                category: procedure.category,
                tags: procedure.tags.join(","),
                stepCount: procedure.steps.length,
                content: searchableContent
            }
        }
    ])
    
    return { id: procedure.id, howto: procedure }
}

export const findHowTo = async (
    query: string,
    env: Env,
    options?: {
        category?: string
        limit?: number
    }
): Promise<Procedure[]> => {
    const limit = options?.limit || 10
    
    // Search in vector store
    const filter: any = { type: "procedure" }
    if (options?.category) {
        filter.category = options.category
    }
    
    const embeddings = (await env.AI.run("@cf/baai/bge-m3", { text: query })) as any
    const values = embeddings.data[0]
    
    const results = await env.VECTORIZE.query(values, {
        topK: limit,
        namespace: PROCEDURE_NAMESPACE,
        filter
    })
    
    if (!results.matches || results.matches.length === 0) {
        return []
    }
    
    // Get full procedures from D1
    const procedures: Procedure[] = []
    for (const match of results.matches) {
        const result = await env.DB.prepare(
            "SELECT content FROM memories WHERE id = ? AND namespace = ? AND deleted_at IS NULL"
        ).bind(match.id, PROCEDURE_NAMESPACE).first()
        
        if (result?.content) {
            try {
                const procedure = JSON.parse(result.content as string) as Procedure
                procedures.push(procedure)
            } catch (error) {
                console.error("Error parsing procedure:", error)
            }
        }
    }
    
    return procedures
}

export const listCapabilities = async (
    env: Env,
    category?: string
): Promise<Array<{ title: string; description: string; category: string; id: string }>> => {
    let query = "SELECT id, content FROM memories WHERE namespace = ? AND deleted_at IS NULL"
    const bindings = [PROCEDURE_NAMESPACE]
    
    if (category) {
        query += " AND content LIKE ?"
        bindings.push(`%"category":"${category}"%`)
    }
    
    query += " ORDER BY created_at DESC"
    
    const results = await env.DB.prepare(query).bind(...bindings).all()
    
    if (!results.results) return []
    
    return results.results.map((row: any) => {
        try {
            const procedure = JSON.parse(row.content) as Procedure
            return {
                id: procedure.id,
                title: procedure.title,
                description: procedure.description,
                category: procedure.category
            }
        } catch {
            return null
        }
    }).filter(Boolean) as Array<{ title: string; description: string; category: string; id: string }>
}

export const getHowToById = async (
    id: string,
    env: Env
): Promise<Procedure | null> => {
    const result = await env.DB.prepare(
        "SELECT content FROM memories WHERE id = ? AND namespace = ? AND deleted_at IS NULL"
    ).bind(id, PROCEDURE_NAMESPACE).first()
    
    if (!result?.content) return null
    
    try {
        return JSON.parse(result.content as string) as Procedure
    } catch {
        return null
    }
}

function createSearchableContent(procedure: Procedure): string {
    const parts = [
        procedure.title,
        procedure.description,
        procedure.category,
        ...procedure.tags,
        ...(procedure.prerequisites || []),
        procedure.successCriteria || "",
        ...procedure.steps.map(step => [
            step.action,
            step.command || "",
            step.expectedResult || "",
            step.notes || ""
        ].join(" "))
    ]
    
    return parts.filter(Boolean).join("\n")
}