export function formatPoints(points: number): string {
  return points.toLocaleString('en-PH')
}

export function formatPointsShort(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`
  }
  return points.toString()
}
