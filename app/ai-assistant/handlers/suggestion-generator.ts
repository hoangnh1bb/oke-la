import {gemini20FlashLiteModel} from '@pfserver/modules/ai-sales-page/services/AIModels'

export default async function generateNextInputMessages(
  assistantResponse: string,
  storeInfo: string,
  callback: (options: string[]) => void
) {
  try {
    // Generate a contextual message using the AI model
    const nextInputMessagesPrompt = `
    You are a UI suggestion engine for a shopping assistant.
    
    Given the assistant's full response and customer profile summary, generate a follow-up array of 2–5 clickable suggestion options for the customer. These will be shown as buttons below the assistant message.
    
    ## Guidelines:
    - Respond with a raw JSON array only (no markdown, no quotes, no explanation).
    - Each item must be concise, natural, and relevant to the assistant's reply.
    - Match the assistant's tone, context and language.
    - If the assistant asks a clarifying question, suggest example answers.
    - If product types or categories are mentioned, suggest those.
    - If no clear focus, return popular product categories or best sellers.
    
    ## Example format:
    [
      "Red summer dress",
      "Gold hoop earrings",
      "Wooden serving tray"
    ]
    
    ## Assistant Response:
    ${assistantResponse}

    ## Your store information and additional knowledge you could use:
    ${storeInfo}
    
    ## Output:
    `

    const nextInputMessagesResponse = await gemini20FlashLiteModel.invoke(nextInputMessagesPrompt, {
      runName: 'Suggesting options',
    })
    const nextInputMessages = nextInputMessagesResponse.content
      .toString()
      .replace(/```json|```/g, '')
      .trim()

    if (nextInputMessages.startsWith('[') && nextInputMessages.endsWith(']')) {
      const options = JSON.parse(nextInputMessages)
      callback(options)
    }
  } catch (err) {}
}
