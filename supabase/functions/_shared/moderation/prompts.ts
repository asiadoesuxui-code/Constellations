export function buildModerationPrompt(wish: string): string {
  const escapedWish = wish.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

  return `You are moderating wishes submitted to a positive collective art project where people send wishes to a shared night sky. A user has submitted the wish: '${escapedWish}'. Evaluate whether this submission should be allowed.

Reject if it contains:

- Hate speech, slurs, or targeted harassment
- Sexual content
- Explicit references to violence, war, or specific violent events
- Spam, advertising, or self-promotion
- Content that's clearly not a sincere wish (random characters, nonsense that doesn't mean anything in English)

Accept if it's a genuine wish, even if it touches on hardship, longing, or difficult feelings in a sincere way.

Respond with only ACCEPT or REJECT. If REJECT, follow with a brief reason on the next line.`
}
