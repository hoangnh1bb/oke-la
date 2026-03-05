import type { IAISalesPageConfigs } from '@pfserver/modules/ai-sales-page/models/AISalesPageConfigs'
import { AI_ASSISTANT_SYSTEM_PROMPT } from '../../prompts/system-prompts'

export function buildSystemPrompt(aiSalesPageConfig: IAISalesPageConfigs): string {
  let systemPrompt = AI_ASSISTANT_SYSTEM_PROMPT.replace(
    '{tone}',
    aiSalesPageConfig?.trainingData?.aiTone || 'friendly-helpful'
  )

  const customInstruction = aiSalesPageConfig?.trainingData?.customInstruction
  if (customInstruction?.trim()) {
    systemPrompt += `\n\n## 🎯 CUSTOM INSTRUCTIONS AND ADDITIONAL INFORMATION:\n${customInstruction.trim()}\n\n**IMPORTANT**: Follow these custom instructions while maintaining all other guidelines above.`
  }

  return systemPrompt
}

export function buildContextParts(
  shopInfo: any,
  branding: any,
  product: any,
  aiSalesPageConfig: IAISalesPageConfigs,
  currentMessage: string
): any[] {
  const parts: any[] = []

  if (shopInfo) {
    const shopContext = `SHOP INFORMATION:
- Shop: ${shopInfo.name || 'Not provided'}
- Currency: ${shopInfo.currency || 'Not specified'}
- Money format: ${shopInfo.money_format || 'Not specified'}
- Product types: ${shopInfo.types?.slice(0, 10).join(', ') || 'Not specified'}`
    parts.push({ text: shopContext })
  }

  if (branding?.slogan || branding?.short_description) {
    const brandingContext = `STORE BRANDING:
- Slogan: ${branding?.slogan || 'Not provided'}
- Description: ${branding?.short_description || 'Not provided'}`
    parts.push({ text: brandingContext })
  }

  if (product) {
    const productContext = `CURRENT PRODUCT DATA:
${JSON.stringify(product, null, 2)}`
    parts.push({ text: productContext })
  }

  if (aiSalesPageConfig?.trainingData?.storePolicies) {
    const policies = aiSalesPageConfig.trainingData.storePolicies
    if (policies.shippingPolicy || policies.returnPolicy) {
      const policyContext = `STORE POLICIES:
${policies.shippingPolicy ? `- Shipping: ${policies.shippingPolicy}` : ''}
${policies.returnPolicy ? `- Returns: ${policies.returnPolicy}` : ''}`
      parts.push({ text: policyContext })
    }
  }

  parts.push({ text: `CUSTOMER QUESTION:\n${currentMessage}` })

  return parts
}
