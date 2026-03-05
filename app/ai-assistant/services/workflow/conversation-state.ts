import {Annotation} from '@langchain/langgraph'
import type {DynamicStructuredTool} from '@langchain/core/tools'
import type {ChatMessage} from '../../handlers/chat-handler'
import type {StreamManager} from '../stream-manager'

export const ConversationState = Annotation.Root({
  messages: Annotation<ChatMessage[]>({
    value: (existing, update) => update || existing || [],
    default: () => [],
  }),
  tools: Annotation<DynamicStructuredTool[]>({
    value: (existing, update) => update || existing,
    default: () => [],
  }),
  context: Annotation<{
    branding?: any
    aiSalesPageConfig?: any
    product?: any
    conversationId?: string
    shopInfo?: any
    shopDomain: string
  }>({
    value: (existing, update) => update || existing,
  }),
  systemPrompt: Annotation<string>({
    value: (existing, update) => update || existing,
    default: () => '',
  }),
  llmResponse: Annotation<string>({
    value: (existing, update) => update || existing,
    default: () => '',
  }),
  functionCalls: Annotation<any[]>({
    value: (existing, update) => [...(existing || []), ...update],
    default: () => [],
  }),
  toolResults: Annotation<any[]>({
    value: (existing, update) => [...(existing || []), ...update],
    default: () => [],
  }),
  stream: Annotation<StreamManager>({
    value: (existing, update) => update || existing,
  }),
  maxIterations: Annotation<number>({
    value: (existing, update) => update ?? existing ?? 5,
    default: () => 5,
  }),
  metadata: Annotation<any>({
    value: (existing, update) => update || existing,
    default: () => ({}),
  }),
  contextParts: Annotation<any[]>({
    value: (existing, update) => update || existing,
    default: () => [],
  }),
})

export type ConversationStateType = typeof ConversationState.State
