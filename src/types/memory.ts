export interface ConversationMessage {
    role: "user" | "assistant" | "system"
    content: string
    timestamp?: string
}

export interface MemoryMetadata {
    tags?: string[]
    category?: "patterns" | "gotchas" | "tools" | "principles" | "architecture"
    relatedMemories?: string[]
}

export interface EnhancedMemory {
    id: string
    content: string
    namespace: string
    conversationContext?: ConversationMessage[]
    contextSummary?: string
    metadata?: MemoryMetadata
    createdAt: string
    deletedAt?: string
}

export interface StoreMemoryWithContextParams {
    content: string
    namespace: string
    conversationContext?: ConversationMessage[]
    metadata?: MemoryMetadata
    env: Env
}