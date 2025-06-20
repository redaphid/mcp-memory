export interface MCPRequest {
    jsonrpc: "2.0"
    id?: string | number
    method: string
    params?: any
}

export interface MCPResponse {
    jsonrpc: "2.0"
    id?: string | number
    result?: any
    error?: {
        code: number
        message: string
        data?: any
    }
}

export interface MCPNotification {
    jsonrpc: "2.0"
    method: string
    params?: any
}