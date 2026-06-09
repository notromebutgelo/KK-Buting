export const DEFAULT_POINTS_RATE = 10

export function getMerchantPointsRate(value: unknown) {
  const rate = Number(value)
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_POINTS_RATE
}

export function formatPesoAmount(value: number) {
  const amount = Math.round(getMerchantPointsRate(value) * 100) / 100
  if (Number.isInteger(amount)) return String(amount)

  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function formatPointsRateLabel(value: unknown, pointUnit = 'point') {
  const rate = getMerchantPointsRate(value)
  return `PHP ${formatPesoAmount(rate)} = 1 ${pointUnit}`
}

export function estimatePointsFromAmount(amountSpent: number, pointsRate: unknown) {
  if (!Number.isFinite(amountSpent) || amountSpent <= 0) return 0

  return Math.max(1, Math.floor(amountSpent / getMerchantPointsRate(pointsRate)))
}

export function getDefaultPointsPolicy(pointsRate: unknown) {
  const rate = getMerchantPointsRate(pointsRate)
  return `Earn 1 point for every PHP ${formatPesoAmount(rate)} spent at this shop. Present your youth QR during checkout.`
}
