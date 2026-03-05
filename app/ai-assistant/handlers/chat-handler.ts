/* eslint-disable max-len */
import {ESender, EStreamType} from '@pfserver/modules/ai-sales-page/constants/enum'
import MCPClient from '@pfserver/modules/ai-sales-page/controllers/ai-assistant/services/mcp-client'
import type {StreamManager} from '@pfserver/modules/ai-sales-page/controllers/ai-assistant/services/stream-manager'
import {AISalesPageConfigs, type IAISalesPageConfigs} from '@pfserver/modules/ai-sales-page/models/AISalesPageConfigs'
import type {IConversationMessageInput} from '@pfserver/modules/ai-sales-page/types/messages'
import getCurrentMessage from '@pfserver/modules/ai-sales-page/utils/getCurrentMessage'
import {addMessage} from '../../conversations/messages/create'
import {handleStreamLLM} from '../services/conversation-handler'
import {generateSectionHtmlTool} from '../tools/generate_section_html'

export interface ChatMessage {
  role: ESender
  content: any
}

/**
 * Handles chat interactions with AI agent for AI Sales Page
 */
export async function handleChatWithAI({
  messages,
  shop,
  shopInfo,
  branding,
  conversationId,
  product,
  stream,
}: {
  messages: IConversationMessageInput[]
  shop: string
  shopInfo: any
  branding: any
  conversationId?: string
  product: any
  stream: StreamManager
}): Promise<void> {
  try {
    // Get recent messages for immediate processing (don't truncate content)
    const recentMessages = messages
      .slice(Math.max(0, messages.length - 10))
      .filter(message => message.content && message.content.trim())

    const {currentMessage, normalizedMessages} = await getCurrentMessage(recentMessages, conversationId)
    const aiSalesPageConfig = (await AISalesPageConfigs.findOne({shopDomain: shop})
      .select('storeInfo trainingData')
      .lean()) as IAISalesPageConfigs

    // Always initialize MCP client and tools - let the LLM decide when to use them
    const mcpClient = new MCPClient(shop)
    await mcpClient.connectToStorefrontServer()
    const tools = [...mcpClient.tools, generateSectionHtmlTool({stream})]
    console.log(`🔧 Loaded ${tools.length} tools for assistant`)

    // Save user message
    if (conversationId) {
      await addMessage(conversationId, shop, {
        content: currentMessage.content.replace(/^[^\S\n]+|[^\S\n]+$/g, ''),
        role: ESender.USER,
      })
    }

    let productsToDisplay: any[] = []

    const assistantResponseText = await handleStreamLLM(
      {
        messages: normalizedMessages,
        tools,
        branding,
        aiSalesPageConfig,
        product,
        conversationId,
        shopInfo,
        shopDomain: shop,
      },
      stream
    )

    if (conversationId && assistantResponseText) {
      await addMessage(conversationId, shop, {
        content: assistantResponseText,
        role: ESender.ASSISTANT,
      })
    }

    // Send product results if available
    if (productsToDisplay.length > 0) {
      // const storefrontAccessToken = await getStorefrontAccessTokenByShopDomain(shop)
      // const storefrontClient = new shopify.clients.Storefront({
      //   domain: shop,
      //   storefrontAccessToken,
      // })
      // const {products} = await getAllNodesByIds(productsToDisplay, storefrontClient, country)

      stream.sendMessage({
        type: EStreamType.PRODUCT_RESULTS,
        products: productsToDisplay,
      })
    }

    // Signal end of turn
    stream.sendMessage({type: EStreamType.END_TURN})
  } catch (error) {
    throw error
  }
}
