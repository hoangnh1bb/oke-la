import {EStreamType} from '@pfserver/modules/ai-sales-page/constants/enum'
import type {StreamManager} from '../stream-manager'

export interface StreamResponse {
  fullResponse: string
  functionCalls: any[]
  usageMetadata: any
}

export async function processStreamResponse(stream: any, streamManager: StreamManager): Promise<StreamResponse> {
  let fullResponse = ''
  const functionCalls: any[] = []
  let usageMetadata: any = null

  for await (const chunk of stream) {
    if (streamManager.isAborted()) {
      console.error('🚫 LLM stream aborted by client')
      break
    }

    const chunkText = chunk.text || ''
    if (chunkText) {
      fullResponse += chunkText
      streamManager.sendMessage({
        type: EStreamType.CHUNK,
        chunk: chunkText,
      })
    }

    if (chunk.functionCalls?.length > 0) {
      functionCalls.push(...chunk.functionCalls)
    }

    if (chunk.usageMetadata) {
      usageMetadata = chunk.usageMetadata
    }
  }

  return {fullResponse, functionCalls, usageMetadata}
}

export function sendMessageComplete(streamManager: StreamManager): void {
  if (!streamManager.isAborted()) {
    streamManager.sendMessage({type: EStreamType.MESSAGE_COMPLETE})
  }
}
