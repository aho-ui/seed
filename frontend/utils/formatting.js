export function formatPercentage(value, decimals = 1) {
  return (value * 100).toFixed(decimals) + '%'
}
