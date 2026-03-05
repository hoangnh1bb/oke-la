import type {Content} from '@google/genai'
import type {ChatMessage} from '../../handlers/chat-handler'

export function formatChatHistory(messages: ChatMessage[], excludeLast = false): Content[] {
  const history: Content[] = []
  const messagesToProcess = excludeLast ? messages.slice(0, -1) : messages
  let previousRole: string | null = null

  for (const msg of messagesToProcess) {
    if (!msg.content?.trim() || (msg as any).role === 'error') {
      continue
    }

    const currentRole = msg.role === 'assistant' ? 'model' : 'user'

    if (previousRole === currentRole) {
      continue
    }

    history.push({
      role: currentRole,
      parts: [{text: msg.content}],
    })
    previousRole = currentRole
  }

  return history
}

export function createUserContent(parts: any[]): Content {
  return {
    role: 'user',
    parts,
  }
}

export function validateContent(content: Content): boolean {
  return !!(
    content.role &&
    content.parts &&
    Array.isArray(content.parts) &&
    content.parts.length > 0 &&
    content.parts.every(part => part && typeof part.text === 'string')
  )
}

export function ensureValidConversation(contents: Content[]): Content[] {
  const validContents = contents.filter(validateContent)
  const finalContents: Content[] = []
  let lastRole: string | null = null

  for (const content of validContents) {
    if (lastRole === content.role) {
      continue
    }
    finalContents.push(content)
    lastRole = content.role || null
  }

  if (finalContents.length === 0) {
    finalContents.push({
      role: 'user',
      parts: [{text: 'Hello'}],
    })
  }

  if (finalContents.length > 0 && finalContents[finalContents.length - 1].role !== 'user') {
    finalContents.push({
      role: 'user',
      parts: [{text: 'Please continue'}],
    })
  }

  return finalContents
}
