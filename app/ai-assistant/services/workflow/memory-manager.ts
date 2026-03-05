import {ESender} from '@pfserver/modules/ai-sales-page/constants/enum'
import type {ChatMessage} from '../../handlers/chat-handler'
import type {ConversationStateType} from './conversation-state'
import {buildSystemPrompt} from '../llm/prompt-builder'

export async function applyMemoryManagement(state: ConversationStateType) {
  const cleanedMessages = cleanConversationHistory(state.messages)

  return {
    messages: cleanedMessages,
    systemPrompt: buildSystemPrompt(state.context.aiSalesPageConfig),
  }
}

export function cleanConversationHistory(messages: ChatMessage[]): ChatMessage[] {
  const cleaned: ChatMessage[] = []
  let lastRole: string | null = null

  for (const msg of messages) {
    if ((msg as any).role === 'error') {
      continue
    }

    if (!msg.content?.trim()) {
      continue
    }

    if (lastRole === msg.role) {
      if (msg.role === 'assistant') {
        cleaned[cleaned.length - 1] = msg
      } else if (msg.role === 'user') {
        const lastMsg = cleaned[cleaned.length - 1]
        lastMsg.content = lastMsg.content + '\n\n' + msg.content
      }
    } else {
      cleaned.push(msg)
      lastRole = msg.role
    }
  }

  if (cleaned.length > 0 && cleaned[0].role === 'assistant') {
    cleaned.unshift({role: ESender.USER, content: 'Hello'})
  }

  return cleaned
}
