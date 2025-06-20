export async function* iterateAllMemories(env: Env) {
    const stmt = env.DB.prepare("SELECT * FROM memories WHERE deleted_at IS NULL ORDER BY created_at DESC")
    const result = await stmt.all()
    
    if (result.results) {
        for (const memory of result.results) {
            yield memory
        }
    }
}