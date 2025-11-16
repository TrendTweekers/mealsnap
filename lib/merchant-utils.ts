export const KNOWN_MERCHANTS = [
  "Biedronka",
  "Żabka",
  "Lidl",
  "Carrefour",
  "Kaufland",
  "Aldi",
  "Rossmann",
  "Hebe",
  "Zara",
  "H&M",
  "Reserved",
  "CCC",
  "Auchan",
  "Pepco",
  "Primark",
  "Ikea",
  "Starbucks",
  "McDonald's",
  "KFC",
  "Decathlon",
]

function longestCommonSubstring(a: string, b: string): string {
  const dp: number[][] = Array(a.length + 1)
    .fill(0)
    .map(() => Array(b.length + 1).fill(0))
  let maxLen = 0
  let endIndex = 0

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j]
          endIndex = i
        }
      }
    }
  }

  return a.slice(endIndex - maxLen, endIndex)
}

export function normalizeMerchantName(raw: string | null): string | null {
  if (!raw) return null
  const cleaned = raw.trim().toLowerCase()

  // simple contains match first
  for (const merchant of KNOWN_MERCHANTS) {
    const m = merchant.toLowerCase()
    if (cleaned.includes(m)) return merchant
  }

  // fallback: basic similarity check
  let best: { name: string; score: number } | null = null

  for (const merchant of KNOWN_MERCHANTS) {
    const m = merchant.toLowerCase()
    const common = longestCommonSubstring(cleaned, m)
    const score = common.length / m.length
    if (!best || score > best.score) best = { name: merchant, score }
  }

  if (best && best.score >= 0.6) return best.name

  return null
}

