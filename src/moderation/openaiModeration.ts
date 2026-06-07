import OpenAI from 'openai'
import { buildModerationPrompt } from './prompts'
import { parseModerationResponse } from './parseModerationResponse'
import type { ModerationDecision } from './types'

const TIMEOUT_MS = 2500
const MODEL = 'gpt-4o-mini'

export type OpenAIModerationResult = ModerationDecision & {
  unavailable?: boolean
}

function getOpenAIApiKey(): string | undefined {
  const key = import.meta.env.VITE_OPENAI_API_KEY
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : undefined
}

function unavailableFallback(): OpenAIModerationResult {
  console.warn(
    '[moderation] OpenAI unavailable; submission passed local checks and needs review later.',
  )
  return { approved: true, needsReview: true, unavailable: true }
}

export async function checkOpenAIModeration(
  text: string,
  options?: { apiKey?: string; buildPrompt?: (value: string) => string },
): Promise<OpenAIModerationResult> {
  const key = options?.apiKey ?? getOpenAIApiKey()
  const buildPrompt = options?.buildPrompt ?? buildModerationPrompt

  if (!key) {
    return unavailableFallback()
  }

  const client = new OpenAI({
    apiKey: key,
    dangerouslyAllowBrowser: true,
    timeout: TIMEOUT_MS,
  })

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: buildPrompt(text),
        },
      ],
    })

    const responseText = completion.choices[0]?.message?.content ?? ''
    const parsed = parseModerationResponse(responseText)

    if (!parsed.approved) {
      return parsed
    }

    return { approved: true }
  } catch {
    return unavailableFallback()
  }
}
