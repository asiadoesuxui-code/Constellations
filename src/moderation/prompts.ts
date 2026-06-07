export function buildModerationPrompt(wish: string): string {
  const escapedWish = wish.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

  return `You are moderating wishes submitted to a positive collective art project where people send wishes to a shared night sky. A user has submitted the wish: '${escapedWish}'. Evaluate whether this submission should be allowed.

Reject if it contains:

- Hate speech, slurs, or targeted harassment
- Sexual content
- Explicit references to violence, war, or specific violent events
- Spam, advertising, or self-promotion
- Random characters or text with no discernible meaning (true gibberish, not merely awkward phrasing)

Accept if it's a genuine wish, including when:
- The English is imperfect, unconventional, or written by a non-native speaker
- Grammar or word choice is slightly off but the meaning is still clear
- It touches on hardship, longing, or difficult feelings in a sincere way

Do not reject a wish only because the sentence structure or wording is not perfectly natural English.

Respond with only ACCEPT or REJECT. If REJECT, follow with a brief reason on the next line.`
}
