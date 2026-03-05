import type {DynamicStructuredTool} from '@langchain/core/tools'

// Helper function to execute tools
export async function executeTool(toolName: string, args: any, tools: DynamicStructuredTool[]): Promise<string> {
  const tool = tools.find(t => t.name === toolName)
  if (!tool) {
    throw new Error(`Tool ${toolName} not found`)
  }

  try {
    const result = await tool.invoke(args)
    return typeof result === 'string' ? result : JSON.stringify(result)
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error)
    return `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}
