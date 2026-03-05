/* eslint-disable @typescript-eslint/no-unused-vars */
import {DynamicStructuredTool} from '@langchain/core/tools'
import {TOOL_NAMES} from '@pfserver/modules/ai-sales-page/constants/tools'
import type {ZodTypeAny} from 'zod'
import {z} from 'zod'
import {searchShopPoliciesTool} from '../tools/search_shop_policies'

interface Tool {
  name: string
  description: string
  input_schema: Record<string, any>
  func: (args: Record<string, any>) => Promise<any>
}

interface JsonRpcResponse {
  jsonrpc: string
  result?: {
    tools?: Tool[]
    [key: string]: any
  }
  error?: {
    type: string
    data: string
  }
  id: number
}

/**
 * Client for interacting with Model Context Protocol (MCP) API endpoints.
 * Manages connections to both customer and storefront MCP endpoints, and handles tool invocation.
 */
class MCPClient {
  public tools: DynamicStructuredTool[]
  private storefrontTools: Tool[]
  private storefrontMcpEndpoint: string

  /**
   * Creates a new MCPClient instance.
   *
   * @param {string} shop - The shopdomain
   * @param {string} conversationId - ID for the current conversation
   * @param {string} shopId - ID of the Shopify shop
   * @param {string} customerMcpEndpoint - Optional custom endpoint for customer MCP
   */
  constructor(shop: string) {
    // Initialize with local tools
    this.tools = [
      searchShopPoliciesTool(shop),
      // searchAdditionalKnowledgeTool(shop)
    ]
    this.storefrontTools = []
    this.storefrontMcpEndpoint = `https://${shop}/api/mcp`
  }

  /**
   * Connects to the storefront MCP server and retrieves available tools.
   *
   * @returns {Promise<Tool[]>} Array of available storefront tools
   * @throws {Error} If connection to MCP server fails
   */
  async connectToStorefrontServer(): Promise<Tool[]> {
    try {
      console.log(`Connecting to MCP server at ${this.storefrontMcpEndpoint}`)

      const headers = {
        'Content-Type': 'application/json',
      }

      const response = await this._makeJsonRpcRequest(this.storefrontMcpEndpoint, 'tools/list', {}, headers)

      // Extract tools from the JSON-RPC response format
      const toolsData = response.result && response.result.tools ? response.result.tools : []
      const storefrontTools = this._formatToolsData(toolsData)

      this.storefrontTools = storefrontTools
      this.tools.push(
        ...storefrontTools
          .filter(tool =>
            [
              TOOL_NAMES.AI_ASSISTANT.SEARCH_SHOP_CATALOG,
              TOOL_NAMES.AI_ASSISTANT.SEARCH_SHOP_POLICIES_AND_FAQS,
            ].includes(tool.name)
          )
          .map(tool => {
            // if (tool.name === TOOL_NAMES.AI_SALES_PAGE.UPDATE_CART) {
            //   return new DynamicStructuredTool({
            //     name: tool.name,
            //     description: tool.description,
            //     schema: toolUpdateCartParameters,
            //     func: (args: Record<string, any>) => this.callStorefrontTool(tool.name, args),
            //   })
            // }

            return new DynamicStructuredTool({
              name: tool.name,
              description:
                tool.description +
                (tool.name === TOOL_NAMES.AI_ASSISTANT.SEARCH_SHOP_CATALOG
                  ? '\nIMPORTANT: You must provide both "query" for the search term and "context" for any additional search context or filters.'
                  : ''),
              schema: this.convertJsonSchemaToZod(tool.input_schema),
              func: (args: Record<string, any>) => this.callStorefrontTool(tool.name, args),
            } as any)
          })
      )
      console.log(`Connected to MCP with ${storefrontTools.length} tools`)
      return storefrontTools
    } catch (e) {
      console.error('Failed to connect to MCP server: ', e)
      throw e
    }
  }

  /**
   * Dispatches a tool call to the appropriate MCP server based on the tool name.
   *
   * @param {string} toolName - Name of the tool to call
   * @param {Record<string, any>} toolArgs - Arguments to pass to the tool
   * @returns {Promise<any>} Result from the tool call
   * @throws {Error} If tool is not found or call fails
   */
  async callTool(toolName: string, toolArgs: Record<string, any>): Promise<any> {
    const tool = this.tools.find(t => t.name === toolName)
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`)
    }

    if (this.storefrontTools.some(t => t.name === toolName)) {
      return this.callStorefrontTool(toolName, toolArgs)
    } else {
      // Call local tool
      return tool.func(toolArgs)
    }
  }

  /**
   * Calls a tool on the storefront MCP server.
   *
   * @param {string} toolName - Name of the storefront tool to call
   * @param {Record<string, any>} toolArgs - Arguments to pass to the tool
   * @returns {Promise<any>} Result from the tool call
   * @throws {Error} If the tool call fails
   */
  async callStorefrontTool(toolName: string, toolArgs: Record<string, any>): Promise<any> {
    try {
      console.log('Calling storefront tool' + JSON.stringify(toolName) + JSON.stringify(toolArgs))

      const headers = {
        'Content-Type': 'application/json',
      }

      const response = await this._makeJsonRpcRequest(
        this.storefrontMcpEndpoint,
        'tools/call',
        {
          name: toolName,
          arguments: toolArgs,
        },
        headers
      )

      console.log('🛍️ Response from Shopify storefront tool', toolName, JSON.stringify({response}))

      return response.result || response
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error)
      throw error
    }
  }

  /**
   * Makes a JSON-RPC request to the specified endpoint.
   *
   * @private
   * @param {string} endpoint - The endpoint URL
   * @param {string} method - The JSON-RPC method to call
   * @param {Record<string, any>} params - Parameters for the method
   * @param {HeadersInit} headers - HTTP headers for the request
   * @returns {Promise<JsonRpcResponse>} Parsed JSON response
   * @throws {Error} If the request fails
   */
  private async _makeJsonRpcRequest(
    endpoint: string,
    method: string,
    params: Record<string, any>,
    headers: any
  ): Promise<JsonRpcResponse> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        id: 1,
        params: params,
      }),
    }).catch(error => {
      console.error('😘Error fetching tools:', error)
      throw error
    })

    if (!response.ok) {
      const error = await response.text()
      const errorObj: Error & {status?: number} = new Error(`Request failed: ${response.status} ${error}`)
      errorObj.status = response.status
      throw errorObj
    }

    return (await response.json()) as JsonRpcResponse
  }

  /**
   * Formats raw tool data into a consistent format.
   *
   * @private
   * @param {any[]} toolsData - Raw tools data from the API
   * @returns {Tool[]} Formatted tools data
   */
  private _formatToolsData(toolsData: any[]): Tool[] {
    return toolsData.map(tool => {
      return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema || tool.input_schema,
        func: tool.func,
      }
    })
  }

  private convertJsonSchemaToZod(schema: any): ZodTypeAny {
    const {type, properties, items, required = []} = schema

    let baseSchema: ZodTypeAny

    switch (type) {
      case 'object':
        const shape: Record<string, ZodTypeAny> = {}

        for (const [key, value] of Object.entries(properties || {})) {
          let propSchema = this.convertJsonSchemaToZod(value)
          if (!required.includes(key)) {
            propSchema = propSchema.optional()
          }
          shape[key] = propSchema
        }

        baseSchema = z.object(shape)
        break

      case 'array':
        const itemSchema = this.convertJsonSchemaToZod(items || {})
        baseSchema = z.array(itemSchema)
        break

      case 'string':
        baseSchema = z.string()
        break

      case 'number':
        baseSchema = z.number()
        break

      case 'integer':
        baseSchema = z.number().int()
        break

      case 'boolean':
        baseSchema = z.boolean()
        break

      default:
        baseSchema = z.any()
        break
    }

    return baseSchema
  }
}

export default MCPClient

// INPORTANT: Shopify's bug: Tool update cart schema wrong format
const toolUpdateCartParameters = {
  type: 'object' as const,
  properties: {
    cart_id: {
      type: 'string' as const,
      description: 'Identifier for the cart being updated. If not provided, a new cart will be created.',
    },
    add_items: {
      type: 'array' as const,
      description: 'Items to add to the cart. Required when creating a new cart.',
      items: {
        type: 'object' as const,
        properties: {
          product_variant_id: {
            type: 'string' as const,
            description: 'The ID of the product variant to add',
          },
          quantity: {
            type: 'string' as const,
            description: 'The quantity to add (must be 1 or greater)',
          },
        },
      },
    },
    update_items: {
      type: 'array' as const,
      description: 'Existing cart line items to update quantities for. Use quantity 0 to remove an item.',
      items: {
        type: 'object' as const,
        properties: {
          line_id: {
            type: 'string' as const,
            description: 'The line item ID to update',
          },
          new_quantity: {
            type: 'string' as const,
            description: 'The new quantity (0 to remove item)',
          },
        },
      },
    },
    remove_line_ids: {
      type: 'array' as const,
      description: 'List of line item IDs to remove explicitly.',
      items: {
        type: 'string' as const,
      },
    },
    buyer_identity: {
      type: 'object' as const,
      description: 'Information about the buyer including email, phone, customer account token, and delivery address.',
      properties: {
        email: {
          type: 'string' as const,
          description: 'Customer email address',
        },
        phone: {
          type: 'string' as const,
          description: 'Customer phone number',
        },
        customer_access_token: {
          type: 'string' as const,
          description: 'Customer account access token',
        },
        country_code: {
          type: 'string' as const,
          description: 'ISO country code, used for regional pricing.',
        },
      },
    },
    delivery: {
      type: 'object' as const,
      description: 'Information about delivery options and delivery addresses.',
      properties: {
        methods: {
          type: 'object' as const,
          description: 'Delivery methods configuration',
          properties: {
            shipping: {
              type: 'array' as const,
              description: 'Shipping methods configuration',
              items: {
                type: 'object' as const,
                properties: {
                  destinations: {
                    type: 'array' as const,
                    description:
                      'Destinations are where the item will be delivered. Add and update delivery addresses for shipping.',
                    items: {
                      type: 'object' as const,
                      properties: {
                        delivery_address: {
                          type: 'object' as const,
                          description: 'Shipping address details',
                          properties: {
                            first_name: {
                              type: 'string' as const,
                              description: 'First name for shipping',
                            },
                            last_name: {
                              type: 'string' as const,
                              description: 'Last name for shipping',
                            },
                            address1: {
                              type: 'string' as const,
                              description: 'Address line 1',
                            },
                            address2: {
                              type: 'string' as const,
                              description: 'Address line 2',
                            },
                            city: {
                              type: 'string' as const,
                              description: 'City name',
                            },
                            province_code: {
                              type: 'string' as const,
                              description: 'Province or state code',
                            },
                            zip: {
                              type: 'string' as const,
                              description: 'ZIP or postal code',
                            },
                            country_code: {
                              type: 'string' as const,
                              description: 'ISO country code',
                            },
                          },
                        },
                        selected_option: {
                          type: 'object' as const,
                          description: 'The selected delivery option for the delivery group.',
                          properties: {
                            id: {
                              type: 'string' as const,
                              description: 'The ID of the cart chosen delivery group.',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    discount_codes: {
      type: 'array' as const,
      description:
        'Discount or promo codes to apply to the cart. Only prompt if customer mentions having a discount code.',
      items: {
        type: 'string' as const,
      },
    },
    gift_card_codes: {
      type: 'array' as const,
      description: 'Gift card codes to apply to the cart. Only prompt if customer mentions having a gift card.',
      items: {
        type: 'string' as const,
      },
    },
    note: {
      type: 'string' as const,
      description:
        'A note or special instructions for the cart. Optional - can ask if customer wants to add special instructions.',
    },
  },
  required: [],
} as const
