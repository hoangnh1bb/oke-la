import {buildContextParts} from '../llm/prompt-builder'
import type {ConversationStateType} from './conversation-state'

export async function buildPromptContext(state: ConversationStateType) {
  const {branding, product, shopInfo, aiSalesPageConfig} = state.context

  const currentMessage = state.messages[state.messages.length - 1]?.content || ''

  const contextParts = buildContextParts(shopInfo, branding, product, aiSalesPageConfig, currentMessage)

  return {
    contextParts,
  }
}
