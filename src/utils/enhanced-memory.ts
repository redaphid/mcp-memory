import { StoreMemoryWithContextParams } from "../types/memory"

export const storeMemoryWithContext = async (
    contentOrParams: string | StoreMemoryWithContextParams,
    namespace?: string,
    env?: Env,
    conversationContext?: any[]
) => ({ memoryId: Math.random().toString() })