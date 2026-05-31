interface ModerationErrorProps {
  message: string
}

export function ModerationError({ message }: ModerationErrorProps) {
  return <div className="moderation-error">{message}</div>
}
