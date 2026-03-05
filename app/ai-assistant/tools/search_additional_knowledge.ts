import {DynamicStructuredTool} from '@langchain/core/tools'
import {EVectorSourceType} from '@pfserver/modules/ai-sales-page/constants'
import {qdrantVectorManager} from '@pfserver/modules/ai-sales-page/services/QdrantVectorStore'
import sortDocumentsByChunkIndex from '@pfserver/modules/ai-sales-page/utils/sortDocumentsByChunkIndex'
import {z} from 'zod'

const SearchAdditionalKnowledgeSchema = z.object({
  query: z.string().describe('The search query or question to find relevant knowledge entries'),
})

type SearchAdditionalKnowledgeInput = z.infer<typeof SearchAdditionalKnowledgeSchema>

export function searchAdditionalKnowledgeTool(shop: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'search_additional_knowledge',
    description:
      'Use this tool ONLY for queries about discounts, promotions, special offers, and merchant-added knowledge (external knowledge). Examples: "Do you have any discount codes?", "Are there any current promotions?". This tool searches both custom knowledge entries and policy information.',
    schema: SearchAdditionalKnowledgeSchema as any,
    func: async ({query}: SearchAdditionalKnowledgeInput) => {
      try {
        console.log(`🔍 Searching for external knowledge with query: "${query}"`)

        const vectorStore = await qdrantVectorManager.getVectorStore()

        const results = await vectorStore.similaritySearch(query, 5, {
          must: [
            {key: 'metadata.shop', match: {value: shop}},
            {key: 'metadata.source', match: {value: EVectorSourceType.EXTERNAL_KNOWLEDGE}},
          ],
        })

        const sortedResults = sortDocumentsByChunkIndex(results)
        const combinedResults = sortedResults.map(doc => doc.pageContent).join('\n\n')

        return {
          content: [
            {
              type: 'text',
              text: combinedResults || 'No result found',
            },
          ],
        }
      } catch (error) {
        console.error('❌ Error in searchAdditionalKnowledgeTool', error)
        return {
          content: [
            {
              type: 'text',
              text: 'No result found',
            },
          ],
        }
      }
    },
  })
}
