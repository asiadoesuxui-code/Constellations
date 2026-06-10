function escapeForPrompt(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function buildSubmissionModerationPrompt(name: string, wish: string): string {
  const escapedName = escapeForPrompt(name)
  const escapedWish = escapeForPrompt(wish)

  return `You are moderating a submission to a positive collective art project where people send wishes to a shared night sky.

FIRST NAME: '${escapedName}'
WISH: '${escapedWish}'

Evaluate the FIRST NAME:
- Accept genuine first names from any language or script (e.g. María, Jean-Pierre, O'Connor, Yuki)
- Reject slurs, hate speech, spam, URLs, gibberish, sexual or violent content, or text that is clearly not a person's first name
- Allow legitimate given names even when they match common English words (e.g. Joy, Will, Hope)

Evaluate the WISH:
- Reject hate speech, slurs, targeted harassment, sexual content, explicit violence, spam, advertising, or true gibberish
- Accept genuine wishes, including imperfect English, non-native phrasing, and sincere hardship or longing
- Do not reject a wish only because the wording is not perfectly natural English

Respond with exactly two lines in this format:
NAME: ACCEPT or NAME: REJECT
WISH: ACCEPT or WISH: REJECT
If you REJECT either field, add a brief reason on the line immediately after that field's line.`
}
