/** Class names for `styles/button-next-hint.css` (rainbow border + optional glow). */
export const btnNextHint = {
  wrap: 'btn-next-hint',
  wrapGlow: 'btn-next-hint--glow',
  target: 'btn-next-hint__target'
} as const

export function btnNextHintWrapClassNames(options: { glow?: boolean }): string {
  const parts: string[] = [btnNextHint.wrap]
  if (options.glow) parts.push(btnNextHint.wrapGlow)
  return parts.join(' ')
}
