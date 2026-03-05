import {getShopByDomain} from '@pfserver/data/models/Shop'
import {IAISalesPageConfigs} from '@pfserver/modules/ai-sales-page/models/AISalesPageConfigs'
import {gemini20FlashModel} from '@pfserver/modules/ai-sales-page/services/AIModels'
import {EAISalesPageTone} from '../../../constants/enum'

/**
 * Generates AI responses based on the AISalesPageConfigs attributes
 */
export async function handleTestWithAIAssistant({
  prompt,
  context,
  customInstructions,
  shopDomain,
  config,
}: {
  prompt: string
  context?: string
  customInstructions?: string[]
  shopDomain: string
  config: IAISalesPageConfigs
}): Promise<string> {
  try {
    // Get shop information for additional context
    const shop = await getShopByDomain(shopDomain)
    // Extract configuration data
    const {storeInfo, trainingData} = config
    const {brandDescription} = storeInfo || {}
    const {aiTone, customInstruction: configCustomInstruction, storePolicies} = trainingData || {}

    // Combine custom instructions and remove duplicates
    const allInstructions = [
      ...(configCustomInstruction ? [configCustomInstruction] : []),
      ...(customInstructions || []),
    ]
    const instructionsToApply = [...new Set(allInstructions.map(instruction => instruction.trim().toLowerCase()))]
      .map(normalizedInstruction =>
        allInstructions.find(original => original.trim().toLowerCase() === normalizedInstruction)
      )
      .filter(Boolean) as string[]

    // Build system prompt based on configuration
    const systemPrompt = buildSystemPrompt({
      brandName: shop?.metadata?.name,
      brandDescription: brandDescription || '',
      tone: aiTone || EAISalesPageTone.FRIENDLY_HELPFUL,
      customInstructions: instructionsToApply,
      storePolicies,
      context,
    })

    // Use Gemini model directly for simple text generation
    const messages = [
      {role: 'system', content: systemPrompt},
      {role: 'user', content: prompt},
    ]

    const response = await gemini20FlashModel.invoke(messages)

    // Handle response content properly
    let responseContent = ''
    try {
      responseContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    } catch (error) {
      responseContent = 'Error generating response'
    }

    return responseContent
  } catch (error) {
    console.error('Error in generateAIResponse:', error)
    throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * Builds a comprehensive system prompt based on the AI Sales Page configuration
 */
function buildSystemPrompt({
  brandName,
  brandDescription,
  tone,
  customInstructions,
  storePolicies,
  context,
}: {
  brandName: string
  brandDescription: string
  tone: string
  customInstructions: string[]
  storePolicies?: {shippingPolicy: string; returnPolicy: string}
  context?: string
}): string {
  let systemPrompt = `You are an AI assistant for ${brandName}, an e-commerce store.`

  // Add brand description if available
  if (brandDescription) {
    systemPrompt += `\n\nAbout ${brandName}:\n${brandDescription}`
  }

  // Add tone and voice instructions
  systemPrompt += `\n\nTone and Voice: Use a ${tone} tone in all your responses. This should be reflected in your language, word choice, and overall communication style.`

  // Add store policies if available
  if (storePolicies) {
    if (storePolicies.shippingPolicy) {
      systemPrompt += `\n\nShipping Policy: ${storePolicies.shippingPolicy}`
    }
    if (storePolicies.returnPolicy) {
      systemPrompt += `\n\nReturn Policy: ${storePolicies.returnPolicy}`
    }
  }

  // Add custom instructions
  if (customInstructions.length > 0) {
    systemPrompt += `\n\nCustom Instructions:\n${customInstructions.map(instruction => `- ${instruction}`).join('\n')}`
  }

  // Add context if provided
  if (context) {
    systemPrompt += `\n\nAdditional Context: ${context}`
  }

  // Add general guidelines with strict limitations
  systemPrompt += `\n\nGuidelines:
- Stay true to the brand voice and tone
- Be helpful and informative
- Focus on customer benefits
- Use natural, conversational language
- Keep responses concise but comprehensive
- Always maintain professionalism

IMPORTANT LIMITATIONS:
- Only respond with information that is explicitly provided in the context, brand description, policies, or custom instructions
- Do NOT provide any product-specific information, specifications, features, or details unless explicitly provided
- Do NOT make product recommendations or suggestions
- Do NOT assume or invent product information
- If asked about products you don't have information for, respond with a sentence that has the same meaning: "I don't have that specific information in this test environment. For a complete test experience, please use the AI in your campaign's live view where I'll have access to all available data."
- If you cannot answer a question based on the provided information, clearly state that you don't have enough information to provide a reliable answer`

  return systemPrompt
}
