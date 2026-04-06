'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './dashboard.module.css'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

type PLData = {
  revenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  sgaTotal: number
  costRatio: number
  operatingProfit: number
  netProfit: number
  otherIncome: number
  sgaItems: { name: string; amount: number }[]
  revenueByPartner: { name: string; amount: number }[]
}

type BSData = {
  currentAssets: number
  fixedAssets: number
  totalAssets: number
  currentLiabilities: number
  totalLiabilities: number
  netAssets: number
  negativeItems: { name: string; amount: number }[]
}

type Idea = {
  id: string
  title: string
  description: string
  reason: string
  initialCost: string
  monthlyRevenue: string
  breakEven: string
  risk: 'low' | 'medium' | 'high'
  score: number
}

type Company = { id: number; display_name: string }

const fmt = (n: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(n)

const fmtShort = (n: number) => {
  if (Math.abs(n) >= 100000000) return `${(n / 100000000).toFixed(1)}億円`
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(0)}万円`
  return `${n}円`
}

export default function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear())
  const [pl, setPL] = useState<PLData | null>(null)
  const [bs, setBS] = useState<BSData | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'diagnosis' | 'ideas' | 'pricing'>('diagnosis')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/freee?type=companies')
      .then((r) => r.json())
      .then((d) => {
        if (d.error === 'unauthorized') { router.push('/'); return }
        setCompanies(d.companies)
        if (d.companies.length > 0) setSelectedCompany(d.companies[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selectedCompany) return
    setLoading(true)
    fetch(`/api/freee?company_id=${selectedCompany}&fiscal_year=${fiscalYear}&type=all`)
      .then((r) => r.json())
      .then((d) => {
        setPL(d.pl)
        setBS(d.bs)
        setIdeas(d.businessIdeas)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedCompany, fiscalYear])

  const isProfit = pl ? pl.netProfit >= 0 : false

  return (
    <div className={styles.layout}>
      {/* サイドバー */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>経営ナビ</div>

        <nav className={styles.nav}>
          {(['diagnosis', 'ideas', 'pricing'] as const).map((t) => (
            <button
              key={t}
              className={`${styles.navItem} ${tab === t ? styles.active : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'diagnosis' && '◈ 財務診断'}
              {t === 'ideas' && '◎ 新規事業'}
              {t === 'pricing' && '◇ 価格設計'}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <select
            className={styles.select}
            value={selectedCompany ?? ''}
            onChange={(e) => setSelectedCompany(Number(e.target.value))}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.display_name || `事業所 ${c.id}`}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
          >
            {[2025, 2024, 2023].map((y) => (
              <option key={y} value={y}>{y}年度</option>
            ))}
          </select>
          <a href="/api/auth/freee" className={styles.logout} onClick={async (e) => {
            e.preventDefault()
            await fetch('/api/auth/freee', { method: 'DELETE' })
            router.push('/')
          }}>ログアウト</a>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className={styles.main}>
        {loading && <div className={styles.loading}>データ読み込み中...</div>}

        {/* 財務診断 */}
        {tab === 'diagnosis' && pl && bs && (
          <div className={styles.content}>
            <h2 className={styles.pageTitle}>財務診断レポート</h2>

            <div className={styles.metricGrid}>
              {[
                { label: '売上高', value: fmtShort(pl.revenue), sub: '当期' },
                { label: '粗利率', value: `${pl.grossMargin.toFixed(1)}%`, sub: pl.grossMargin < 0 ? '⚠ 赤字' : '良好' },
                { label: '費用対売上比', value: `${Math.round(pl.costRatio)}%`, sub: pl.costRatio > 200 ? '⚠ 要注意' : '正常' },
                { label: '当期純損益', value: fmtShort(pl.netProfit), sub: isProfit ? '黒字' : '⚠ 赤字', danger: !isProfit },
              ].map((m) => (
                <div key={m.label} className={`${styles.metric} ${m.danger ? styles.danger : ''}`}>
                  <span className={styles.metricLabel}>{m.label}</span>
                  <span className={styles.metricValue}>{m.value}</span>
                  <span className={styles.metricSub}>{m.sub}</span>
                </div>
              ))}
            </div>

            {/* 販管費内訳チャート */}
            {pl.sgaItems.length > 0 && (
              <div className={styles.chartCard}>
                <h3 className={styles.cardTitle}>販管費の内訳</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pl.sgaItems} layout="vertical" margin={{ left: 8, right: 40 }}>
                    <XAxis type="number" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} tick={{ fill: 'rgba(240,240,245,0.4)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(240,240,245,0.7)', fontSize: 12 }} width={80} />
                    <Tooltip formatter={(v: number) => fmtShort(v)} contentStyle={{ background: '#1c1c26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {pl.sgaItems.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#6c63ff' : `rgba(108,99,255,${0.6 - i * 0.1})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 売上取引先 */}
            {pl.revenueByPartner.length > 0 && (
              <div className={styles.chartCard}>
                <h3 className={styles.cardTitle}>売上の取引先内訳</h3>
                <div className={styles.partnerList}>
                  {pl.revenueByPartner.map((p, i) => (
                    <div key={i} className={styles.partnerRow}>
                      <span className={styles.partnerName}>{p.name}</span>
                      <div className={styles.partnerBar}>
                        <div
                          className={styles.partnerBarFill}
                          style={{ width: `${(p.amount / pl.revenue) * 100}%` }}
                        />
                      </div>
                      <span className={styles.partnerAmt}>{fmtShort(p.amount)}</span>
                    </div>
                  ))}
                </div>
                {pl.revenueByPartner.length === 1 && (
                  <p className={styles.warn}>⚠ 売上が1社に集中しています。リスク分散を検討してください。</p>
                )}
              </div>
            )}

            {/* BSサマリー */}
            <div className={styles.chartCard}>
              <h3 className={styles.cardTitle}>貸借対照表サマリー</h3>
              <div className={styles.bsGrid}>
                {[
                  { label: '流動資産', value: fmtShort(bs.currentAssets) },
                  { label: '固定資産', value: fmtShort(bs.fixedAssets) },
                  { label: '流動負債', value: fmtShort(bs.currentLiabilities) },
                  { label: '純資産', value: fmtShort(bs.netAssets), danger: bs.netAssets < 0 },
                ].map((item) => (
                  <div key={item.label} className={`${styles.bsItem} ${item.danger ? styles.danger : ''}`}>
                    <span className={styles.bsLabel}>{item.label}</span>
                    <span className={styles.bsValue}>{item.value}</span>
                  </div>
                ))}
              </div>
              {bs.negativeItems.length > 0 && (
                <div className={styles.negativeList}>
                  <p className={styles.warn}>⚠ 残高がマイナスの項目があります：</p>
                  {bs.negativeItems.map((n, i) => (
                    <span key={i} className={styles.negativeTag}>{n.name}：{fmtShort(n.amount)}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 新規事業提案 */}
        {tab === 'ideas' && (
          <div className={styles.content}>
            <h2 className={styles.pageTitle}>新規事業提案</h2>
            <p className={styles.pageDesc}>あなたの会社のfreeeデータをもとに、実現可能性の高い事業を提案します。</p>

            {ideas.length === 0 && !loading && (
              <p className={styles.empty}>財務診断タブでデータを読み込んでください。</p>
            )}

            {ideas.map((idea, i) => (
              <div key={idea.id} className={`${styles.ideaCard} ${i === 0 ? styles.topIdea : ''}`}>
                {i === 0 && <span className={styles.topBadge}>最おすすめ</span>}
                <div className={styles.riskBadge} data-risk={idea.risk}>
                  {idea.risk === 'low' ? '低リスク' : idea.risk === 'medium' ? '中リスク' : '高リスク'}
                </div>
                <h3 className={styles.ideaTitle}>{idea.title}</h3>
                <p className={styles.ideaDesc}>{idea.description}</p>
                <div className={styles.ideaReason}>{idea.reason}</div>
                <div className={styles.ideaKPIs}>
                  <div className={styles.kpi}><span>初期投資</span><strong>{idea.initialCost}</strong></div>
                  <div className={styles.kpi}><span>月次売上見込み</span><strong>{idea.monthlyRevenue}</strong></div>
                  <div className={styles.kpi}><span>損益分岐</span><strong>{idea.breakEven}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 価格設計 */}
        {tab === 'pricing' && <PricingTab />}
      </main>
    </div>
  )
}

// 価格設計タブ（コンポーネント分離）
function PricingTab() {
  const [cogs, setCogs] = useState(3000)
  const [labor, setLabor] = useState(500)
  const [shipping, setShipping] = useState(300)
  const [ads, setAds] = useState(200)
  const [other, setOther] = useState(200)
  const [margin, setMargin] = useState(30)
  const [units, setUnits] = useState(100)
  const [market, setMarket] = useState(8000)

  const totalCost = cogs + labor + shipping + ads + other
  const targetPrice = Math.round(totalCost / (1 - margin / 100))
  const monthlyProfit = Math.round((targetPrice - totalCost) * units)

  const scenarios = [
    { label: '最低ライン', price: Math.round(totalCost * 1.05), color: '#ff5c5c' },
    { label: '目標価格', price: targetPrice, color: '#6c63ff', recommended: true },
    { label: '市場価格', price: market, color: '#00d4aa' },
    { label: 'プレミアム', price: Math.round(targetPrice * 1.3), color: '#f5a623' },
  ]

  return (
    <div className={styles.content}>
      <h2 className={styles.pageTitle}>価格設計シミュレーター</h2>

      <div className={styles.pricingGrid}>
        <div className={styles.inputPanel}>
          <h3 className={styles.cardTitle}>原価・費用</h3>
          {[
            { label: '原材料費・仕入れ', val: cogs, set: setCogs },
            { label: '人件費（1個あたり）', val: labor, set: setLabor },
            { label: '配送・梱包費', val: shipping, set: setShipping },
            { label: '広告費（1個あたり）', val: ads, set: setAds },
            { label: 'その他費用', val: other, set: setOther },
          ].map((f) => (
            <div key={f.label} className={styles.inputRow}>
              <label>{f.label}</label>
              <input
                type="number"
                value={f.val}
                onChange={(e) => f.set(Number(e.target.value))}
                className={styles.numInput}
              />
              <span>円</span>
            </div>
          ))}

          <h3 className={styles.cardTitle} style={{ marginTop: 24 }}>目標設定</h3>
          <div className={styles.inputRow}>
            <label>目標利益率</label>
            <input type="range" min={5} max={80} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className={styles.range} />
            <span>{margin}%</span>
          </div>
          <div className={styles.inputRow}>
            <label>月間販売目標</label>
            <input type="number" value={units} onChange={(e) => setUnits(Number(e.target.value))} className={styles.numInput} />
            <span>個</span>
          </div>
          <div className={styles.inputRow}>
            <label>競合相場価格</label>
            <input type="number" value={market} onChange={(e) => setMarket(Number(e.target.value))} className={styles.numInput} />
            <span>円</span>
          </div>
        </div>

        <div className={styles.resultPanel}>
          <div className={styles.metricGrid}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>総原価</span>
              <span className={styles.metricValue}>{totalCost.toLocaleString()}円</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>目標価格</span>
              <span className={styles.metricValue} style={{ color: '#6c63ff' }}>{targetPrice.toLocaleString()}円</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>月間目標利益</span>
              <span className={styles.metricValue} style={{ color: '#00d4aa' }}>{monthlyProfit.toLocaleString()}円</span>
            </div>
          </div>

          <h3 className={styles.cardTitle}>価格シナリオ</h3>
          {scenarios.map((s) => {
            const profit = s.price - totalCost
            const profitRate = s.price > 0 ? Math.round((profit / s.price) * 100) : 0
            const maxP = Math.max(...scenarios.map((x) => x.price)) * 1.1
            return (
              <div key={s.label} className={`${styles.scenarioRow} ${s.recommended ? styles.recommended : ''}`}>
                <div className={styles.scenarioInfo}>
                  <span className={styles.scenarioLabel}>{s.label}</span>
                  {s.recommended && <span className={styles.recBadge}>おすすめ</span>}
                  <div className={styles.scenarioBar}>
                    <div style={{ width: `${(s.price / maxP) * 100}%`, background: s.color, height: '100%', borderRadius: 4 }} />
                  </div>
                </div>
                <div className={styles.scenarioPrice}>
                  <strong>{s.price.toLocaleString()}円</strong>
                  <span style={{ color: profit >= 0 ? '#00d4aa' : '#ff5c5c', fontSize: 12 }}>
                    {profit >= 0 ? `▲${profitRate}%` : `▼赤字`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
