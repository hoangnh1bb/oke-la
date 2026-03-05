import {END, START, StateGraph} from '@langchain/langgraph'
import {aispTracer} from '@pfserver/modules/ai-sales-page/services/AIModels'
import {ConversationState} from './conversation-state'
import {applyMemoryManagement} from './memory-manager'
import {buildPromptContext} from './context-builder'
import {generateLLMResponse} from './llm-generator'
import {executeTools, shouldContinue, finalizeResponse} from './tool-executor'

export function createConversationWorkflow() {
  const workflow = new StateGraph(ConversationState)
    .addNode('applyMemoryManagement', applyMemoryManagement)
    .addNode('buildPromptContext', buildPromptContext)
    .addNode('generateLLMResponse', generateLLMResponse)
    .addNode('executeTools', executeTools)
    .addNode('finalizeResponse', finalizeResponse)
    .addEdge(START, 'applyMemoryManagement')
    .addEdge('applyMemoryManagement', 'buildPromptContext')
    .addEdge('buildPromptContext', 'generateLLMResponse')
    .addEdge('generateLLMResponse', 'executeTools')
    .addConditionalEdges('executeTools', shouldContinue, {
      continue: 'generateLLMResponse',
      end: 'finalizeResponse',
    })
    .addEdge('finalizeResponse', END)

  return workflow.compile().withConfig({
    runName: `[🤖 Main AI Assistant]: LangGraph Workflow`,
    callbacks: [aispTracer],
    metadata: {
      workflow: 'ai_assistant',
      version: '1.0.0',
    },
  })
}
