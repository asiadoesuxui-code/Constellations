import { buildModerationPrompt } from './prompts.ts'
import { parseModerationResponse } from './parseModerationResponse.ts'

const TIMEOUT_MS = 2500
const MODEL = 'gpt-4o-mini'

function unavailableFallback(): { approved: boolean; needsReview?: boolean } {
  console.warn(
    '[moderation] OpenAI unavailable; submission passed local checks and needs review later.',
  )
  return { approved: true, needsReview: true }
}

export async function checkOpenAIModeration(
  text: string,
  buildPrompt: (value: string) => string = buildModerationPrompt,
): Promise<{ approved: boolean; reason?: string; needsReview?: boolean }> {
  const key = Deno.env.get('OPENAI_API_KEY')

  if (!key) {
    return unavailableFallback()
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: buildPrompt(text),
          },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      return unavailableFallback()
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    const parsed = parseModerationResponse(text)

    if (!parsed.approved) {
      return parsed
    }

    return { approved: true }
  } catch {
    return unavailableFallback()
  } finally {
    clearTimeout(timeout)
  }
}
