export function buildNameModerationPrompt(name: string): string {
  const escapedName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

  return `You are moderating first names for a positive collective art project. A user entered the name: '${escapedName}'.

Accept genuine first names from any language or script (e.g. María, Jean-Pierre, O'Connor, Yuki, محمد).

Reject if it:
- Is a slur, hate speech, or deliberately offensive word (not a legitimate given name)
- Is spam, advertising, a URL, or random gibberish
- Contains sexual or violent content
- Is clearly not a person's first name

Allow legitimate given names even when they match common English words (e.g. Joy, Will, Hope).

Respond with only ACCEPT or REJECT. If REJECT, follow with a brief reason on the next line.`
}
