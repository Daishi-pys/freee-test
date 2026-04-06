// src/lib/freee.ts
// freee API との通信を担うユーティリティ

const FREEE_API_BASE = 'https://api.freee.co.jp'

export async function freeeGet(
  path: string,
  accessToken: string,
  query: Record<string, string | number> = {}
) {
  const url = new URL(`${FREEE_API_BASE}${path}`)
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`freee API error ${res.status}: ${err}`)
  }

  return res.json()
}

// ---- 型定義 ----

export type PLBalance = {
  account_category_name: string
  account_item_name?: string
  closing_balance: number
  composition_ratio: number
  total_line?: boolean
  hierarchy_level: number
  partners?: { name: string; closing_balance: number }[]
}

export type BSBalance = {
  account_category_name: string
  account_item_name?: string
  closing_balance: number
  total_line?: boolean
  hierarchy_level: number
}

// ---- データ取得関数 ----

export async function fetchPL(accessToken: string, companyId: number, fiscalYear: number) {
  const data = await freeeGet('/api/1/reports/trial_pl', accessToken, {
    company_id: companyId,
    fiscal_year: fiscalYear,
    breakdown_display_type: 'partner',
  })
  return data.trial_pl.balances as PLBalance[]
}

export async function fetchBS(accessToken: string, companyId: number, fiscalYear: number) {
  const data = await freeeGet('/api/1/reports/trial_bs', accessToken, {
    company_id: companyId,
    fiscal_year: fiscalYear,
  })
  return data.trial_bs.balances as BSBalance[]
}

export async function fetchCompanies(accessToken: string) {
  const data = await freeeGet('/api/1/companies', accessToken)
  return data.companies as { id: number; display_name: string }[]
}

export async function fetchDeals(
  accessToken: string,
  companyId: number,
  limit = 50
) {
  const data = await freeeGet('/api/1/deals', accessToken, {
    company_id: companyId,
    limit,
  })
  return data.deals
}

// ---- 財務分析ユーティリティ ----

export function analyzePL(balances: PLBalance[]) {
  const get = (name: string) =>
    balances.find((b) => b.account_category_name === name && b.total_line)
      ?.closing_balance ?? 0

  const revenue = Math.abs(get('売上高'))
  const cogs = Math.abs(get('売上原価'))
  const grossProfit = get('売上総損益金額')
  const sgaTotal = Math.abs(get('販売管理費'))
  const operatingProfit = get('営業損益金額')
  const netProfit = get('当期純損益金額')
  const otherIncome = get('営業外収益')

  // 販管費の内訳（上位5科目）
  const sgaItems = balances
    .filter((b) => b.account_category_name === '販売管理費' && !b.total_line && b.account_item_name)
    .map((b) => ({ name: b.account_item_name!, amount: Math.abs(b.closing_balance) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // 売上の取引先内訳
  const revItem = balances.find((b) => b.account_item_name === '売上高')
  const revenueByPartner =
    revItem?.partners
      ?.filter((p) => p.name !== '未選択')
      .map((p) => ({ name: p.name, amount: Math.abs(p.closing_balance) }))
      .sort((a, b) => b.amount - a.amount) ?? []

  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  const costRatio = revenue > 0 ? (sgaTotal / revenue) * 100 : 0

  return {
    revenue,
    cogs,
    grossProfit,
    grossMargin,
    sgaTotal,
    costRatio,
    operatingProfit,
    netProfit,
    otherIncome,
    sgaItems,
    revenueByPartner,
  }
}

export function analyzeBS(balances: BSBalance[]) {
  const get = (name: string) =>
    balances.find((b) => b.account_category_name === name && b.total_line)
      ?.closing_balance ?? 0

  const currentAssets = get('流動資産')
  const fixedAssets = get('固定資産')
  const totalAssets = get('資産')
  const currentLiabilities = get('流動負債')
  const totalLiabilities = get('負債')
  const netAssets = get('純資産')

  // 口座残高チェック（マイナスの項目）
  const negativeItems = balances
    .filter((b) => !b.total_line && b.closing_balance < 0)
    .map((b) => ({ name: b.account_item_name || b.account_category_name, amount: b.closing_balance }))

  return {
    currentAssets,
    fixedAssets,
    totalAssets,
    currentLiabilities,
    totalLiabilities,
    netAssets,
    negativeItems,
  }
}

// 新規事業提案ロジック
export function generateBusinessIdeas(
  pl: ReturnType<typeof analyzePL>,
  bs: ReturnType<typeof analyzeBS>
) {
  const ideas = []

  // 賃料収入がある → 不動産活用
  if (pl.otherIncome > 1000000) {
    ideas.push({
      id: 'coworking',
      title: 'コワーキング／レンタルオフィス事業',
      description: '賃料収入がある＝不動産を持っている強みを活かす',
      reason: `賃料収入${(pl.otherIncome / 10000).toFixed(0)}万円の実績あり。既存スペースをコワーキングに転換すれば追加投資を最小化できる。`,
      initialCost: '100〜300万円',
      monthlyRevenue: '50〜150万円',
      breakEven: '3〜6ヶ月',
      risk: 'low',
      score: 90,
    })
  }

  // 外注費が大きい → DX支援
  const outsourceCost = pl.sgaItems.find((i) => i.name === '外注費')?.amount ?? 0
  if (outsourceCost > 1000000) {
    ideas.push({
      id: 'dx',
      title: '中小企業向けDX支援パッケージ',
      description: '外注先との関係を活かし、自社ブランドでDX支援を販売',
      reason: `外注費${(outsourceCost / 10000).toFixed(0)}万円 → 優秀なデザイン・IT制作パートナーが既にいる証拠。取引先の中小企業がそのままターゲットになる。`,
      initialCost: '50万円〜',
      monthlyRevenue: '100〜300万円',
      breakEven: '2〜4ヶ月',
      risk: 'medium',
      score: 80,
    })
  }

  // 取引先が複数 → サブスク経営支援
  if (pl.revenueByPartner.length >= 3) {
    ideas.push({
      id: 'subscription',
      title: '中小企業向け経営支援サブスク',
      description: 'freee活用・財務診断・経営アドバイスを月額定額で提供',
      reason: `${pl.revenueByPartner.length}社との取引関係がある。同じ悩みを持つ周辺企業へ横展開しやすい。初期投資ほぼゼロで始められる。`,
      initialCost: 'ほぼゼロ',
      monthlyRevenue: '30〜100万円',
      breakEven: '即日〜1ヶ月',
      risk: 'low',
      score: 75,
    })
  }

  // 広告費が大きい → 広告代理・マーケ支援
  const adsCost = pl.sgaItems.find((i) => i.name === '広告宣伝費')?.amount ?? 0
  if (adsCost > 500000) {
    ideas.push({
      id: 'marketing',
      title: 'デジタルマーケティング代行',
      description: '広告運用ノウハウを他社に販売する',
      reason: `広告宣伝費${(adsCost / 10000).toFixed(0)}万円を使ってきた実績がある。この経験・ノウハウ自体が商品になる。`,
      initialCost: '10〜50万円',
      monthlyRevenue: '50〜200万円',
      breakEven: '1〜3ヶ月',
      risk: 'medium',
      score: 65,
    })
  }

  return ideas.sort((a, b) => b.score - a.score)
}
