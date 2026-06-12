export function peso(value: number | string | undefined | null) {
  const amount = Number(value || 0)
  return amount.toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  })
}

export function shortDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function maskMemberId(value?: string | null) {
  const text = String(value || '')
  if (text.length <= 8) return text || 'Member'
  return `${text.slice(0, 4)}...${text.slice(-4)}`
}

export function linesToText(value: unknown) {
  if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean).join('\n')
  return String(value || '')
}

export function textToLines(value: unknown) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}
