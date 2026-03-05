import {EStreamType} from '@pfserver/modules/ai-sales-page/constants/enum'
import {traceToolExecution} from '@pfserver/modules/ai-sales-page/services/LangSmith'
import {executeTool} from './tool-runner'
import type {ConversationStateType} from './conversation-state'

export const executeTools = traceToolExecution(async function (state: ConversationStateType) {
  const {functionCalls, tools, stream} = state

  if (!functionCalls?.length) {
    return {toolResults: []}
  }

  const toolResults: any[] = []

  for (const functionCall of functionCalls) {
    try {
      const toolResult = await executeTool(functionCall.name, functionCall.args, tools)
      const toolResultData = {
        name: functionCall.name,
        response: toolResult,
      }
      toolResults.push(toolResultData)
    } catch (error) {
      console.error(`Error executing tool ${functionCall.name}:`, error)
      const errorResult = {
        name: functionCall.name,
        response: error instanceof Error ? error.message : 'Unknown error',
      }
      toolResults.push(errorResult)
    }

    stream.sendMessage({type: EStreamType.NEW_MESSAGE})
  }

  return {toolResults}
})

export async function shouldContinue(state: ConversationStateType) {
  const {functionCalls, maxIterations, stream} = state

  if (stream.isAborted()) {
    return 'end'
  }

  if (!functionCalls?.length) {
    return 'end'
  }

  if (maxIterations <= 0) {
    return 'end'
  }

  return 'continue'
}

export async function finalizeResponse(state: ConversationStateType) {
  const {llmResponse, stream} = state

  if (llmResponse && !stream.isAborted()) {
    stream.sendMessage({type: EStreamType.MESSAGE_COMPLETE})
  }

  return {llmResponse}
}
