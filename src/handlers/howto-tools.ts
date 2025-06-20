import { rememberHowTo, findHowTo, listCapabilities } from "../utils/howto-memory"

export const rememberHowToTool = {
    name: "rememberHowTo",
    description: "Remember step-by-step instructions for completing a task",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "A clear title for what this procedure accomplishes"
            },
            steps: {
                type: "array",
                description: "The steps to complete the task",
                items: {
                    type: "object",
                    properties: {
                        order: { type: "number" },
                        action: { type: "string" },
                        command: { type: "string" },
                        expectedResult: { type: "string" },
                        errorHandling: { type: "string" },
                        notes: { type: "string" }
                    },
                    required: ["order", "action"]
                }
            },
            description: {
                type: "string",
                description: "Detailed description of what this procedure does"
            },
            category: {
                type: "string",
                description: "Category like 'mcp-setup', 'file-operations', 'debugging'"
            },
            tags: {
                type: "array",
                items: { type: "string" },
                description: "Tags for easier discovery"
            },
            prerequisites: {
                type: "array",
                items: { type: "string" },
                description: "What needs to be in place before starting"
            },
            successCriteria: {
                type: "string",
                description: "How to verify the procedure worked"
            }
        },
        required: ["title", "steps"]
    }
}

export const rememberHowToHandler = async (
    { title, steps, description, category, tags, prerequisites, successCriteria }: {
        title: string
        steps: Array<{
            order: number
            action: string
            command?: string
            expectedResult?: string
            errorHandling?: string
            notes?: string
        }>
        description?: string
        category?: string
        tags?: string[]
        prerequisites?: string[]
        successCriteria?: string
    },
    context: { env: Env }
) => {
    try {
        const result = await rememberHowTo(
            title,
            steps,
            context.env,
            {
                description,
                category,
                tags,
                prerequisites,
                successCriteria
            }
        )
        
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Remembered how to: ${title}\nID: ${result.id}\nSteps: ${result.howto.steps.length}`
                }
            ]
        }
    } catch (error) {
        console.error("Error in rememberHowTo:", error)
        throw new Error(`Failed to remember procedure: ${error}`)
    }
}

export const findHowToTool = {
    name: "findHowTo",
    description: "Find step-by-step procedures for completing tasks",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "What you want to learn how to do"
            },
            category: {
                type: "string",
                description: "Optional category filter"
            }
        },
        required: ["query"]
    }
}

export const findHowToHandler = async (
    { query, category }: { query: string; category?: string },
    context: { env: Env }
) => {
    try {
        const procedures = await findHowTo(query, context.env, { category })
        
        if (procedures.length === 0) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: "No procedures found for that query."
                    }
                ]
            }
        }
        
        const formattedProcedures = procedures.map(proc => {
            const steps = proc.steps.map(step => 
                `${step.order}. ${step.action}${step.command ? `\n   Command: ${step.command}` : ''}${step.expectedResult ? `\n   Expected: ${step.expectedResult}` : ''}`
            ).join('\n')
            
            return `**${proc.title}**\n${proc.description}\n\nSteps:\n${steps}\n\n${proc.successCriteria ? `Success: ${proc.successCriteria}\n` : ''}`
        }).join('\n---\n')
        
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Found ${procedures.length} procedure(s):\n\n${formattedProcedures}`
                }
            ]
        }
    } catch (error) {
        console.error("Error in findHowTo:", error)
        throw new Error(`Failed to find procedures: ${error}`)
    }
}

export const listCapabilitiesTool = {
    name: "listCapabilities",
    description: "List all things I know how to do",
    inputSchema: {
        type: "object",
        properties: {
            category: {
                type: "string",
                description: "Optional category filter"
            }
        }
    }
}

export const listCapabilitiesHandler = async (
    { category }: { category?: string },
    context: { env: Env }
) => {
    try {
        const capabilities = await listCapabilities(context.env, category)
        
        if (capabilities.length === 0) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: "No capabilities stored yet."
                    }
                ]
            }
        }
        
        const grouped = capabilities.reduce((acc, cap) => {
            if (!acc[cap.category]) acc[cap.category] = []
            acc[cap.category].push(cap)
            return acc
        }, {} as Record<string, typeof capabilities>)
        
        const formatted = Object.entries(grouped)
            .map(([cat, caps]) => 
                `**${cat}**\n${caps.map(c => `- ${c.title}: ${c.description}`).join('\n')}`
            ).join('\n\n')
        
        return {
            content: [
                {
                    type: "text" as const,
                    text: `I know how to do ${capabilities.length} things:\n\n${formatted}`
                }
            ]
        }
    } catch (error) {
        console.error("Error in listCapabilities:", error)
        throw new Error(`Failed to list capabilities: ${error}`)
    }
}