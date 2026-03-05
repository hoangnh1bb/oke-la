import {traceable} from 'langsmith/traceable'
import type {ConversationStateType} from './conversation-state'
import {formatChatHistory, createUserContent, ensureValidConversation} from '../llm/content-formatter'
import {createGeminiRequest, generateContentStream} from '../llm/gemini-client'
import {processStreamResponse} from '../llm/response-handler'
import {trackUsageMetadata} from '../tracing/usage-tracker'
import {GEMINI_MODEL_NAME} from '../llm'

export async function generateLLMResponse(state: ConversationStateType) {
  return await traceable(
    async function geminiChat() {
      const {stream, tools, systemPrompt, messages, contextParts} = state

      if (stream.isAborted()) {
        return {llmResponse: ''}
      }

      const history = formatChatHistory(messages, true)
      let contents = [...history]

      if (contextParts?.length > 0) {
        const currentUserTurn = createUserContent(contextParts)
        contents = [...history, currentUserTurn]
      } else {
        if (history.length === 0) {
          contents = [createUserContent([{text: 'Hello'}])]
        }
      }

      const finalContents = ensureValidConversation(contents)
      const request = await createGeminiRequest(finalContents, systemPrompt, tools)

      try {
        const result = await generateContentStream(request)
        const {fullResponse, functionCalls, usageMetadata} = await processStreamResponse(result, stream)

        if (usageMetadata) {
          trackUsageMetadata(GEMINI_MODEL_NAME, usageMetadata)
        }

        return {
          llmResponse: fullResponse,
          functionCalls,
        }
      } catch (error: any) {
        console.error('Error in LLM generation:', error)

        // Provide user-friendly message for service unavailability
        if (error?.status === 503) {
          return {
            llmResponse:
              "<p>I apologize, but I'm experiencing temporary technical difficulties. Please try again in a moment. If this persists, our team is already working on it!</p>",
            functionCalls: [],
          }
        }

        // For other errors, provide a generic friendly message
        if (error?.status && error.status >= 500) {
          return {
            llmResponse:
              "<p>I'm having trouble connecting right now. Please try again in a few seconds, and I'll be happy to help you!</p>",
            functionCalls: [],
          }
        }

        throw error
      }
    },
    {
      name: 'Gemini Chat',
      run_type: 'llm',
      metadata: {
        ls_provider: 'google',
        ls_model_name: GEMINI_MODEL_NAME,
        shopDomain: state.context?.shopDomain,
        conversationId: state.context?.conversationId,
      },
    }
  )()
}
