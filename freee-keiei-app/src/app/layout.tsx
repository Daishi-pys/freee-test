import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'freee 経営ナビ',
  description: 'freeeのデータから経営診断・新規事業提案・価格設計をAIが支援',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
