import {traceable} from 'langsmith/traceable'

const LANGSMITH_PROJECTS = {
  DEFAULT: 'ai-sales-page',
  WORKFLOW: 'ai-sales-page-workflow',
  TOOLS: 'ai-sales-page-tools',
  MEMORY: 'ai-sales-page-memory',
} as const

export function createTraceable<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  projectType: keyof typeof LANGSMITH_PROJECTS = 'DEFAULT'
): T {
  if (!(process.env.LANGSMITH_TRACING === 'true' && process.env.LANGSMITH_API_KEY)) {
    return fn
  }

  const project = LANGSMITH_PROJECTS[projectType]

  return traceable(fn, {
    name,
    metadata: {
      project,
      projectType,
    },
  }) as T
}

export function createRunMetadata(shopDomain: string, conversationId?: string, product?: any) {
  return {
    shopDomain,
    conversationId: conversationId || 'anonymous',
    product,
    projects: LANGSMITH_PROJECTS,
  }
}

export const traceConversationMemory = <T extends (...args: any[]) => any>(fn: T) =>
  createTraceable(fn, 'conversation-memory-management', 'MEMORY')

export const traceToolExecution = <T extends (...args: any[]) => any>(fn: T) =>
  createTraceable(fn, 'tool-execution', 'TOOLS')

export const traceLLMGeneration = <T extends (...args: any[]) => any>(fn: T) =>
  createTraceable(fn, 'llm-generation', 'WORKFLOW')

export const traceStreamResponse = <T extends (...args: any[]) => any>(fn: T) =>
  createTraceable(fn, 'stream-response', 'WORKFLOW')
