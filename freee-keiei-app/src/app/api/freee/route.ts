// src/app/api/freee/route.ts
// PL・BS・取引先データを返すAPIエンドポイント

import { NextRequest, NextResponse } from 'next/server'
import { fetchPL, fetchBS, fetchCompanies, analyzePL, analyzeBS, generateBusinessIdeas } from '@/lib/freee'

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get('freee_access_token')?.value
  if (!accessToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('company_id')
  const fiscalYear = searchParams.get('fiscal_year')
  const type = searchParams.get('type') ?? 'all'

  try {
    if (type === 'companies') {
      const companies = await fetchCompanies(accessToken)
      return NextResponse.json({ companies })
    }

    if (!companyId || !fiscalYear) {
      return NextResponse.json({ error: 'company_id and fiscal_year are required' }, { status: 400 })
    }

    const cid = Number(companyId)
    const year = Number(fiscalYear)

    const [plBalances, bsBalances] = await Promise.all([
      fetchPL(accessToken, cid, year),
      fetchBS(accessToken, cid, year),
    ])

    const pl = analyzePL(plBalances)
    const bs = analyzeBS(bsBalances)
    const businessIdeas = generateBusinessIdeas(pl, bs)

    return NextResponse.json({ pl, bs, businessIdeas })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
