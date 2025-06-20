export interface Step {
    order: number
    action: string
    command?: string
    expectedResult?: string
    errorHandling?: string
    notes?: string
}

export interface Procedure {
    id: string
    title: string
    description: string
    category: string
    tags: string[]
    prerequisites?: string[]
    steps: Step[]
    createdAt: string
    updatedAt?: string
    successCriteria?: string
    troubleshooting?: Record<string, string>
}

export interface ProcedureSearchResult {
    procedure: Procedure
    score: number
    matchReason: string
}