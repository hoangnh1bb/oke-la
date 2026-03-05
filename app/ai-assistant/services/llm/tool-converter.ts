import type {FunctionDeclaration} from '@google/genai'
import {Type} from '@google/genai'
import type {DynamicStructuredTool} from '@langchain/core/tools'

// Helper function to convert Zod schema to Google GenAI Type
function convertZodTypeToGenAIType(zodType: any): any {
  if (!zodType) return {type: Type.STRING}

  const typeName = zodType._def?.typeName

  switch (typeName) {
    case 'ZodString':
      return {type: Type.STRING}
    case 'ZodNumber':
      return {type: Type.NUMBER}
    case 'ZodBoolean':
      return {type: Type.BOOLEAN}
    case 'ZodArray':
      return {
        type: Type.ARRAY,
        items: convertZodTypeToGenAIType(zodType._def.type),
      }
    case 'ZodObject':
      const properties: Record<string, any> = {}
      const shape = zodType._def.shape()
      Object.keys(shape).forEach(key => {
        properties[key] = convertZodTypeToGenAIType(shape[key])
      })
      return {
        type: Type.OBJECT,
        properties,
      }
    case 'ZodUnion':
      // For unions, default to the first type or string if complex
      const options = zodType._def.options
      if (options && options.length > 0) {
        return convertZodTypeToGenAIType(options[0])
      }
      return {type: Type.STRING}
    case 'ZodOptional':
      return convertZodTypeToGenAIType(zodType._def.innerType)
    case 'ZodEnum':
      return {
        type: Type.STRING,
        enum: zodType._def.values,
      }
    default:
      return {type: Type.STRING}
  }
}

// Helper function to convert LangChain tools to Google GenAI function declarations
export function convertToolsToFunctionDeclarations(tools: DynamicStructuredTool[]): FunctionDeclaration[] {
  return tools.map(tool => {
    const schema = tool.schema as any
    const properties: Record<string, any> = {}
    const required: string[] = []

    // Convert Zod schema to Google GenAI schema format
    if (schema && schema._def?.shape) {
      const shape = schema._def.shape()
      Object.keys(shape).forEach(key => {
        const field = shape[key]
        const genAIType = convertZodTypeToGenAIType(field)

        properties[key] = {
          ...genAIType,
          description: field.description || field._def?.description || `${key} parameter`,
        }

        // Check if field is required (not optional)
        if (field._def?.typeName !== 'ZodOptional') {
          required.push(key)
        }
      })
    }

    return {
      name: tool.name,
      description: tool.description,
      parametersJsonSchema: {
        type: Type.OBJECT,
        properties,
        required,
      },
    }
  })
}
