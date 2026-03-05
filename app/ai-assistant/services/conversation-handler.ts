import type {DynamicStructuredTool} from '@langchain/core/tools'
import type {IAISalesPageConfigs} from '@pfserver/modules/ai-sales-page/models/AISalesPageConfigs'
import type {ChatMessage} from '../handlers/chat-handler'
import type {StreamManager} from './stream-manager'
import {createConversationWorkflow} from './workflow'
import {createRunMetadata} from './tracing/langsmith-tracer'

export interface ConversationParams {
  messages: ChatMessage[]
  tools: DynamicStructuredTool[]
  branding: any
  aiSalesPageConfig: IAISalesPageConfigs
  product: any
  conversationId?: string
  shopInfo?: any
  shopDomain: string
}

export async function handleStreamLLM(params: ConversationParams, stream: StreamManager): Promise<string> {
  const runMetadata = createRunMetadata(params.shopDomain, params.conversationId, params.product)
  const workflow = createConversationWorkflow()

  const initialState = {
    messages: params.messages,
    tools: params.tools,
    context: {
      branding: params.branding,
      aiSalesPageConfig: params.aiSalesPageConfig,
      product: params.product,
      conversationId: params.conversationId,
      shopInfo: params.shopInfo,
      shopDomain: params.shopDomain,
    },
    stream,
    metadata: runMetadata,
  }

  try {
    const result = await workflow.invoke(initialState as any)
    return result.llmResponse || ''
  } catch (error) {
    console.error('Error in LangGraph workflow:', error)
    if (!stream.isAborted()) {
      throw error
    }
    return ''
  }
}
