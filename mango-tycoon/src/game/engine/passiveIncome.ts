import type { OwnedAsset, IncomeNotification } from '../../types/game'

const MS_PER_HOUR = 1_000 * 60 * 60

export function calculatePassiveIncome(
  ownedAssets: OwnedAsset[],
  lastLogin: string,
): IncomeNotification {
  const now = Date.now()
  const last = new Date(lastLogin).getTime()
  // Cap at 72 hours so being offline for 3+ days doesn't print a crazy number
  const hoursElapsed = Math.min((now - last) / MS_PER_HOUR, 72)

  let total = 0
  const breakdown: IncomeNotification['breakdown'] = []

  for (const owned of ownedAssets) {
    const hourlyYield = owned.asset.yieldRate / 100 / 24
    const income = Math.floor(owned.boughtAt * owned.quantity * hourlyYield * hoursElapsed)
    if (income > 0) {
      total += income
      breakdown.push({ assetName: owned.asset.name, income })
    }
  }

  return { total, breakdown }
}
