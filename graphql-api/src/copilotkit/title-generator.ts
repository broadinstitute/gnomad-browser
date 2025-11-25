import { GoogleGenerativeAI } from '@google/generative-ai'
import config from '../config'
import logger from '../logger'
import { ChatMessage } from './database'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

// Cleans up the generated title
const cleanTitle = (title: string): string => {
  return title.replace(/["*]/g, '').trim()
}

export const generateTitleForChat = async (messages: ChatMessage[]): Promise<string | null> => {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    logger.warn('GOOGLE_GENERATIVE_AI_API_KEY is not set, skipping title generation.')
    return null
  }

  try {
    const model = genAI.getGenerativeModel({ model: config.COPILOT_TITLING_MODEL })

    const history = messages
      .map((msg) => `${msg.role}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`)
      .join('\n')

    const prompt = `Generate a very short, concise title (max 5 words) for the following conversation. The title should summarize the main topic.

IMPORTANT:
- If gene names (e.g., BRCA1, TP53) or variant IDs (e.g., 1-55516888-G-GA) are discussed, include the most frequently mentioned ones in the title.
- If multiple genes/variants are discussed, prioritize the most frequently mentioned.
- If no specific genes or variants can be identified, use "multiple" as appropriate.
- Do not use quotes or asterisks in the title.

Conversation:
---
${history}
---
Title:`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    if (!text) {
      return null
    }

    return cleanTitle(text)
  } catch (error: any) {
    logger.error({ message: 'Failed to generate title from AI model', error: error.message })
    return null
  }
}
