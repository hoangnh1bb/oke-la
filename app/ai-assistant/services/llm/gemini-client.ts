import type {Content, FunctionCallingConfigMode} from '@google/genai'
import type {DynamicStructuredTool} from '@langchain/core/tools'
import {googleGenAI} from '@pfserver/modules/ai-sales-page/services/AIModels'
import {convertToolsToFunctionDeclarations} from './tool-converter'
import {GEMINI_MODEL_NAME} from './constants'

export interface GeminiRequest {
  model: string
  contents: Content[]
  systemInstruction: {parts: [{text: string}]}
  tools?: [{functionDeclarations: any[]}]
  toolConfig?: {functionCallingConfig: {mode: FunctionCallingConfigMode}}
  temperature: number
  maxOutputTokens: number
}

export interface GeminiStreamChunk {
  text?: string
  functionCalls?: any[]
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export async function createGeminiRequest(
  contents: Content[],
  systemPrompt: string,
  tools: DynamicStructuredTool[]
): Promise<GeminiRequest> {
  const functionDeclarations = convertToolsToFunctionDeclarations(tools)

  return {
    model: GEMINI_MODEL_NAME,
    contents,
    systemInstruction: {parts: [{text: systemPrompt}]},
    tools: functionDeclarations.length > 0 ? [{functionDeclarations}] : undefined,
    toolConfig:
      functionDeclarations.length > 0
        ? {functionCallingConfig: {mode: 'AUTO' as FunctionCallingConfigMode}}
        : undefined,
    temperature: 0.2,
    maxOutputTokens: 1024,
  }
}

export async function generateContentStream(request: GeminiRequest) {
  const maxRetries = 3
  const baseDelay = 1000 // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await googleGenAI.models.generateContentStream(request)
    } catch (error: any) {
      console.log('🔴 Gemini API error: ', error)
      // Check if it's a 503 Service Unavailable error
      if (error?.status === 503 && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff: 1s, 2s, 4s
        console.log(`⚠️ Gemini API 503 error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // Check for rate limiting (429) or other retryable errors
      if ((error?.status === 429 || error?.status === 500) && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) * 1.5 // Slightly longer delay for rate limits
        console.log(
          `⚠️ Gemini API ${error.status} error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // If not retryable or max retries reached, throw the error
      throw error
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Max retries reached for Gemini API')
}

export function extractStreamData(chunk: any): GeminiStreamChunk {
  return {
    text: chunk.text || '',
    functionCalls: chunk.functionCalls || [],
    usageMetadata: chunk.usageMetadata,
  }
}
