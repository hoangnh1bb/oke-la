import {getCurrentRunTree} from 'langsmith/traceable'
import {calculateGeminiCost, getGeminiPricing} from '@pfserver/modules/ai-sales-page/services/GeminiCostCalculator'

export interface UsageMetadata {
  promptTokenCount: number
  candidatesTokenCount: number
  totalTokenCount: number
}

export function trackUsageMetadata(modelName: string, usageMetadata: UsageMetadata): void {
  const tracingData: any = {}

  if (usageMetadata) {
    const run = getCurrentRunTree()
    if (!run) return

    tracingData.usage_metadata = {
      input_tokens: usageMetadata.promptTokenCount ?? undefined,
      output_tokens: usageMetadata.candidatesTokenCount ?? undefined,
      total_tokens: usageMetadata.totalTokenCount ?? undefined,
    }

    const cost = calculateGeminiCost(modelName, usageMetadata)
    if (cost > 0) {
      const pricing = getGeminiPricing(modelName)
      tracingData.usage_metadata.input_cost = (usageMetadata.promptTokenCount / 1_000_000) * pricing.inputCostPer1M
      tracingData.usage_metadata.output_cost =
        (usageMetadata.candidatesTokenCount / 1_000_000) * pricing.outputCostPer1M
      tracingData.usage_metadata.total_cost = cost
    }

    run.metadata = {
      ...run.metadata,
      ...tracingData,
    }
  }
}
