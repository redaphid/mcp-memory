export const updateMemory = async (
    memoryId: string, 
    updates: {
        content?: string
        tags?: string[]
        conversationContext?: any[]
        contextSummary?: string
    }, 
    env: Env
) => {
    const updateFields = []
    const bindings = []
    
    if (updates.content !== undefined) {
        updateFields.push("content = ?")
        bindings.push(updates.content)
    }
    
    if (updates.tags !== undefined) {
        updateFields.push("tags = ?")
        bindings.push(JSON.stringify(updates.tags))
    }
    
    if (updates.conversationContext !== undefined) {
        updateFields.push("conversation_context = ?")
        bindings.push(JSON.stringify(updates.conversationContext))
    }
    
    if (updates.contextSummary !== undefined) {
        updateFields.push("context_summary = ?")
        bindings.push(updates.contextSummary)
    }
    
    if (updateFields.length === 0) {
        return { success: false, error: "No fields to update" }
    }
    
    updateFields.push("updated_at = ?")
    bindings.push(new Date().toISOString())
    
    bindings.push(memoryId)
    
    const query = `UPDATE memories SET ${updateFields.join(", ")} WHERE id = ? AND deleted_at IS NULL`
    
    try {
        const result = await env.DB.prepare(query).bind(...bindings).run()
        return { success: result.meta.changes > 0 }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}