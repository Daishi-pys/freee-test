'use client'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.noise} />
      <div className={styles.grid} />

      <div className={styles.hero}>
        <div className={styles.badge}>freee × AI</div>
        <h1 className={styles.title}>
          あなたの会社の<br />
          <span className={styles.accent}>経営を、数字から。</span>
        </h1>
        <p className={styles.desc}>
          freeeに繋ぐだけで、財務診断・新規事業提案・価格設計を<br />
          AIがリアルタイムで行います。
        </p>

        <a href="/api/auth/freee" className={styles.loginBtn}>
          <span className={styles.freeeIcon}>f</span>
          freeeアカウントでログイン
        </a>

        <p className={styles.note}>
          freeeの読み取り・書き込み権限を使用します。データは外部に送信されません。
        </p>
      </div>

      <div className={styles.features}>
        {[
          { icon: '◈', title: '財務診断', desc: 'PLとBSを自動分析。費用構造の問題や資金リスクをすぐ把握。' },
          { icon: '◎', title: '新規事業提案', desc: 'あなたの会社の強みをデータから読み取り、具体的な事業アイデアを提案。' },
          { icon: '◇', title: '価格シミュレーター', desc: '原価・目標利益率・市場価格から最適な単価を計算。' },
        ].map((f) => (
          <div key={f.title} className={styles.featureCard}>
            <span className={styles.featureIcon}>{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
