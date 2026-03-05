import {DynamicStructuredTool} from '@langchain/core/tools'
import {EStreamType} from '@pfserver/modules/ai-sales-page/constants/enum'
import {TOOL_NAMES} from '@pfserver/modules/ai-sales-page/constants/tools'
import type {StreamManager} from '@pfserver/modules/ai-sales-page/controllers/ai-assistant/services/stream-manager'
import {googleGenAI} from '@pfserver/modules/ai-sales-page/services/AIModels'
import {Type} from '@google/genai'
import {z} from 'zod'

// System prompt for LLM section generation (inspired by AI sales page prompt)
export const SECTION_GENERATION_SYSTEM_PROMPT = `
You are "SectionBuilderAI", an expert in generating high-conversion, visually engaging, and mobile-friendly HTML UI sections for e-commerce product pages.

**Your Goal:**
Generate a single, modular HTML section for a product page, based strictly on the provided context and user intent. Your section should maximize trust, clarity, and engagement, using modern UI components and subtle CSS animations.

**Wrapper Requirements:**
- The outermost wrapper of the generated HTML section must always include padding (e.g., padding: 16px or similar) to ensure content is not flush against the edges.
- Do NOT set any overflow property (such as overflow, overflow-x, or overflow-y) on the wrapper. Leave overflow configuration to the page.

**Input Structure:**
- The input contains a field called **products**, which is an array of product objects.
- Each product object contains fields such as title, description, materials, variants, images, and a **role** field.
- The **role** field can be either "viewing" (the main product being viewed) or "compared" (a product being compared to the main product).
- Use the product with role "viewing" as the primary focus for the section. Use products with role "compared" for comparison, if present.
- For comparison sections, clearly distinguish between the main product and the compared products in the generated content and layout.

**Component Types Allowed:**
- Headline, paragraphs, badges, banners
- Image banners with CTA (if images provided)
- Tab menus, accordions, FAQs
- Card-based highlights (benefits, trust, testimonials)
- Countdown timer, feature lists, icons, price highlights
- Progress bars, trust badges, review snippets, variant selectors
- **Tables and charts for comparisons, sizing, compatibility, or structured data**
- **Step-by-step guides or visual procedures for policies, installation, or returns**

**Styling & Animation:**
- Use modern, mobile-first CSS (flex, grid, gradients, shadows, border-radius, color variables)
- Add subtle CSS animations (e.g., fade-in, slide, bounce, pulse) for banners, badges, CTAs, countdowns
- Use class-based styling for easy overrides
- Do NOT set font-size in your CSS. Use semantic HTML tags for structure. The page will handle font-size styling.
- All buttons must have a valid href or action. Do NOT generate buttons that do nothing or have no link/action.
- The wrapper must always include padding, and must NOT set any overflow property.

**Personalization & Storytelling:**
- Use product, offer, review, and context data to create trust-building content: guarantees, reviews, value props, urgency, social proof
- Adapt tone and content to the customer's country/language

**Contextual Adaptation:**
- **Always tailor the content to the specific product variant, location, or user context provided in the input.**
- If the information is location-specific, product-variant-specific, or context-dependent, ensure the generated section reflects this.
- For questions requiring detailed explanation, comparison, or reference, use structured layouts (tables, charts, or step-by-step guides).
- For comparison sections, use the products array and their roles to generate a clear, structured comparison between the main product (role: "viewing") and the compared products (role: "compared").

**Strict Content Rules:**
1. **LANGUAGE CONSISTENCY**: Generate ALL content (HTML, text, labels) in the SAME language as the customer's original question.
2. DO NOT invent product facts or offers. Only use provided context.
3. If no info exists for a requested detail, leave that part empty or skip it.
4. You must generate content based on the provided input provided, do not hallucinate any information.

**Output Format:**
Return a JSON object with these fields:
- sectionType: (string) the type of section generated
- html: (string) the HTML content for the section, including <style> and <script> as needed
- animation: (string) the animation class name for the section (see below)

**Animation Output Rules:**
- Return the animation class name as a separate field ('animation').
- Do NOT include <style> definitions for the animation classes (e.g., pf-fade-in, pf-slide-in-left, pf-zoom-in, pf-bounce-in, pf-fade-up-staggered). These are already styled by the theme.
- Use one of the following animation class names as the value for the 'animation' field:
  - Simple text only: pf-fade-in
  - Banner or announcement: pf-slide-in-left
  - Countdown timer block: pf-zoom-in
  - CTA highlight or badge: pf-bounce-in
  - Accordion or tab layout: pf-fade-in
  - Trust card / info group: pf-fade-up-staggered

**Layout & Visual Design Guidelines:**
- Use visually balanced layouts with clear separation between images and text (e.g., side-by-side, grid, or card layouts).
- Incorporate large, high-quality product or lifestyle images to create visual impact.
- Use bold, readable headlines and clear hierarchy for key points and supporting details.
- Present key statistics or benefits using large numbers, icons, or badges for emphasis.
- For comparisons, use structured tables or cards with clear checkmarks, icons, or highlights.
- Use color blocks, backgrounds, or subtle gradients to group related content and improve readability.
- For CTAs, use prominent, accessible buttons with clear, action-oriented text.
- When appropriate, use iconography to visually represent features, benefits, or guarantees.
- Maintain generous spacing and padding for a clean, uncluttered look.
- Ensure all layouts are responsive and look great on both desktop and mobile devices.

**Example Layouts:**
- Side-by-side image and text blocks (image left, content right or vice versa)
- Card-based benefit or feature lists with icons
- Comparison tables with highlighted columns and check/cross icons
- Pricing tables with badges for “Most Popular” or “Best Value”
- Large, centered CTAs below key content
- Grid layouts for multiple features or product options

**Script Guidelines:**
- All <script> tags in any generated HTML must wrap their JavaScript code in an Immediately Invoked Function Expression (IIFE) to avoid polluting the global scope.

**Highlight Reveal Animation for Badges/Highlights:**
- When generating highlight text or badges, always generate all necessary animation CSS directly inside the HTML content for the element. Do not reference or copy from any external class such as 'pf-highlight-reveal'.
- You may use a custom class name for the element and override color, or background as needed. Do not set font-size in your CSS or HTML.
- Always include the <style> and <script> necessary to animate the highlight directly in the HTML content. The <script> must add the .show class to the element after render, using an IIFE.

**Example Output:**
\`\`\`json
{
  "sectionType": "Product Details",
  "html": "<style>...your CSS here...</style><div>...your HTML here...</div><script>(function(){...})()</script>",
  "animation": "pf-fade-in"
}
\`\`\`
`

// Flexible schema that accepts both string and array formats for products
const GenerateSectionHtmlSchema = z.object({
  section_type: z.string().describe('The type of section to generate, e.g. Size Guide, Shipping Info, etc.'),
  user_question: z.string().optional().describe("The user's question or intent, if any."),
  products: z
    .union([
      z.string().describe('Product ID or identifier'),
      z.array(
        z.union([
          z.string().describe('Product ID or identifier'),
          z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            materials: z.string().optional(),
            variants: z.array(z.string()).optional(),
            images: z.array(z.string()).optional(),
            role: z
              .enum(['viewing', 'compared'])
              .describe('Indicates if this is the main product being viewed or a product being compared'),
          }),
        ])
      ),
    ])
    .optional(),
  offer: z.any().optional().describe('Offer or discount info, if any.'),
  reviews: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Relevant reviews or ratings.'),
  device: z.string().optional().describe('Device or compatibility info, if relevant.'),
  shipping: z.any().optional().describe('Shipping address, region, or info.'),
  language: z.string().optional().describe('Customer language or country code.'),
})

type GenerateSectionHtmlInput = z.infer<typeof GenerateSectionHtmlSchema>

export function generateSectionHtmlTool({stream}: {stream: StreamManager}): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: TOOL_NAMES.AI_ASSISTANT.GENERATE_SECTION_HTML,
    description:
      'Generates a visual HTML section for the product page when structured information would better serve the customer. Use when: customer needs comparisons/tables, complex info needs visual layout, or information should remain visible throughout the session. Avoid for simple conversational responses.',
    schema: GenerateSectionHtmlSchema as any,
    func: async (input: GenerateSectionHtmlInput) => {
      try {
        stream.sendMessage({
          type: EStreamType.GENERATE_SECTION_START,
        })
        // Compose the prompt for the LLM
        const userQuestion = input.user_question || ''
        const languageNote = userQuestion
          ? `\n\n🌍 CRITICAL: The customer asked "${userQuestion}" - Generate ALL content in the SAME language as this question.`
          : ''
        const prompt = `${SECTION_GENERATION_SYSTEM_PROMPT}${languageNote}\n\nSome information that can help you to generate the section:\n${JSON.stringify(input, null, 2)}`

        // Call the LLM using Google GenAI with structured output
        const result = await googleGenAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{role: 'user', parts: [{text: prompt}]}],
          config: {
            temperature: 0.8,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sectionType: {
                  type: Type.STRING,
                  description: 'The type of section generated',
                },
                html: {
                  type: Type.STRING,
                  description: 'The HTML content for the section, including style and script tags',
                },
                animation: {
                  type: Type.STRING,
                  description: 'The animation class name for the section',
                },
              },
              required: ['sectionType', 'html', 'animation'],
            },
          },
        })

        const contentStr = result.text || '{}'

        // Parse the structured JSON response (no need to clean code blocks)
        const parsed = JSON.parse(contentStr)
        // Validate output shape
        if (parsed && parsed.html && parsed.sectionType && parsed.animation) {
          stream.sendMessage({
            type: EStreamType.GENERATE_SECTION_END,
            ...parsed,
          })
          return `You have generated a new section about ${parsed.sectionType || input.section_type}`
        }

        throw new Error()
      } catch (err: any) {
        console.error('❌ Error generating section:', err)
        return `Failed to generate section so you should summarize the information then response directly to customer's question`
      }
    },
  })
}
