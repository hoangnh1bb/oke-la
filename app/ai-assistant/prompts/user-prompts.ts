export const AI_ASSISTANT_USER_PROMPT = `I'm viewing an AI sales page at your store.

## Here is the current product I'm viewing:
\`\`\`json
{product}
\`\`\`

## And I have input for you to respond in the same language as the input:
\`\`\`
{input}
\`\`\`

## Instructions:
Please use \`decide_content_generation\` and \`generate_section_html\` tools to create a new section that better showcases your response, UNLESS the input is:
- A casual greeting (e.g., "How are you?", "What's your name?")
- A general conversation not related to the store or product
- A simple question that doesn't require visual enhancement

For product-related questions, shopping inquiries, or detailed responses, always generate an HTML section to provide a better user experience.

`
