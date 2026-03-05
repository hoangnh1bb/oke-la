import { DynamicStructuredTool } from '@langchain/core/tools'
import shopify from '@pfserver/bootstrap/shopify/shopify'
import { shopifySessionStorage } from '@pfserver/bootstrap/shopify/custom-session-storage'
import { TOOL_NAMES } from '@pfserver/modules/ai-sales-page/constants/tools'
import { z } from 'zod'

interface ShopPolicy {
  id: string
  title: string
  body: string
  url: string
}

interface ShopPolicyWithDefault extends ShopPolicy {
  handle: string
}

export interface ShopPoliciesResult {
  privacyPolicy?: ShopPolicy
  refundPolicy?: ShopPolicy
  shippingPolicy?: ShopPolicy
  termsOfService?: ShopPolicy
  subscriptionPolicy?: ShopPolicyWithDefault
  shopName?: string
  description?: string
  moneyFormat?: string
  primaryDomain?: {
    host: string
    sslEnabled: boolean
    url: string
  }
}

/**
 * Fetch shop policies using shop domain
 * @param shopDomain - The shop domain (e.g., 'myshop.myshopify.com')
 * @returns Shop policies and shop information
 */
export const getShopPoliciesByDomain = async (shopDomain: string): Promise<ShopPoliciesResult> => {
  try {
    const offlineSessionId = shopify.session.getOfflineId(shopDomain)
    const session = await shopifySessionStorage.loadSession(offlineSessionId)

    if (!session) {
      console.error('Failed to load session for Storefront API:', shopDomain)
      return {}
    }

    const storefrontClient = new shopify.clients.Storefront({
      session,
    })

    const response = await storefrontClient.query({
      data: `
        query getShopPolicies {
          shop {
            name
            description
            moneyFormat
            primaryDomain {
              host
              sslEnabled
              url
            }
            privacyPolicy {
              id
              title
              body
              url
            }
            refundPolicy {
              id
              title
              body
              url
            }
            shippingPolicy {
              id
              title
              body
              url
            }
            termsOfService {
              id
              title
              body
              url
            }
            subscriptionPolicy {
              id
              title
              body
              url
              handle
            }
          }
        }
      `,
    })

    const shop = (response as any)?.body?.data?.shop

    if (!shop) {
      return {}
    }

    return {
      shopName: shop.name,
      description: shop.description,
      moneyFormat: shop.moneyFormat,
      primaryDomain: shop.primaryDomain,
      privacyPolicy: shop.privacyPolicy,
      refundPolicy: shop.refundPolicy,
      shippingPolicy: shop.shippingPolicy,
      termsOfService: shop.termsOfService,
      subscriptionPolicy: shop.subscriptionPolicy,
    }
  } catch (error) {
    console.error('❌ Error fetching shop policies for domain:', shopDomain, error)
    return {}
  }
}

// Schema for shop policies tool input parameters
const ShopPoliciesToolSchema = z.object({
  policyType: z
    .enum(['all', 'privacy', 'refund', 'shipping', 'terms', 'subscription'])
    .optional()
    .default('all')
    .describe('Specific policy type to retrieve, or "all" for all policies'),
})

type ShopPoliciesToolInput = z.infer<typeof ShopPoliciesToolSchema>

/**
 * Create a DynamicStructuredTool for getting shop policies
 * @param shopDomain - The shop domain to fetch policies for
 * @returns DynamicStructuredTool instance
 */
export function searchShopPoliciesTool(shopDomain: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: TOOL_NAMES.AI_ASSISTANT.SEARCH_SHOP_POLICIES,
    description: `Fetch shop policies including privacy, refund, shipping, terms of service, and subscription policies for ${shopDomain}. Use this tool when customers ask about store policies, return policy, shipping information, terms of service, or privacy policy.`,
    schema: ShopPoliciesToolSchema as any,
    func: async ({ policyType }: ShopPoliciesToolInput) => {
      const policies = await getShopPoliciesByDomain(shopDomain)
      console.log('✅ Run policies tool with policies:', policies)

      const POLICY_INSTRUCTION = `
      ## Shop Policies Context

      Here is the shop policies in JSON format. DO NOT include all policies in your response.

      ### Critical Instructions:
      1. **Be Selective**: Only extract and use policy sections that are DIRECTLY relevant to:
         - The customer's specific question or concern
         - The customer's location/region (e.g., if customer is from Vietnam, focus ONLY on Vietnam-specific sections)
         - The customer's profile and purchase history

      2. **Location-Based Filtering**:
         - Identify customer's location from their profile or conversation context
         - Extract ONLY the policy content applicable to their region
         - Ignore policies for other countries/regions entirely

      3. **Smart Summarization**:
         - Don't quote entire policy sections
         - Extract and paraphrase the specific information that answers the customer's question
         - Keep responses concise and relevant

      4. **Context Matching**:
         - If customer asks about shipping to Vietnam → Only use Vietnam shipping information
         - If customer asks about returns → Only extract return policy relevant to their purchase/location
         - If customer asks about privacy → Only highlight privacy aspects they're concerned about

      ### Response Guidelines:
      - Provide targeted, personalized policy information
      - Skip irrelevant sections completely
      - Focus on answering the customer's specific need
      - Keep the response brief and actionable

      ### Policy Data:
      `
      // Filter by policy type if specified
      if (policyType && policyType !== 'all') {
        const filteredPolicies: ShopPoliciesResult = {
          shopName: policies.shopName,
          description: policies.description,
          moneyFormat: policies.moneyFormat,
        }

        switch (policyType) {
          case 'privacy':
            filteredPolicies.privacyPolicy = policies.privacyPolicy
            break
          case 'refund':
            filteredPolicies.refundPolicy = policies.refundPolicy
            break
          case 'shipping':
            filteredPolicies.shippingPolicy = policies.shippingPolicy
            break
          case 'terms':
            filteredPolicies.termsOfService = policies.termsOfService
            break
          case 'subscription':
            filteredPolicies.subscriptionPolicy = policies.subscriptionPolicy
            break
        }

        return POLICY_INSTRUCTION + `\`\`\`json\n${JSON.stringify(filteredPolicies)}\n\`\`\``
      }

      return POLICY_INSTRUCTION + `\`\`\`json\n${JSON.stringify(policies)}\n\`\`\``
    },
  })
}
