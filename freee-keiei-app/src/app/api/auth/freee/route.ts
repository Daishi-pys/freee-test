// src/app/api/auth/freee/route.ts
// freee OAuth 認証フロー

import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = process.env.FREEE_CLIENT_ID!
const CLIENT_SECRET = process.env.FREEE_CLIENT_SECRET!
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/auth/freee`

// Step 1: freee認証ページにリダイレクト
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  // コールバック（コードあり）
  if (code) {
    const tokenRes = await fetch('https://accounts.secure.freee.co.jp/public_api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL('/error?msg=token_failed', req.url))
    }

    const tokens = await tokenRes.json()

    // トークンをcookieに保存（本番ではDB保存推奨）
    const response = NextResponse.redirect(new URL('/dashboard', req.url))
    response.cookies.set('freee_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.expires_in,
      path: '/',
    })
    response.cookies.set('freee_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return response
  }

  // Step 1: freeeの認証URLへリダイレクト
  const authUrl = new URL('https://accounts.secure.freee.co.jp/public_api/authorize')
  authUrl.searchParams.set('client_id', CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'read write')

  return NextResponse.redirect(authUrl)
}

// ログアウト
export async function DELETE() {
  const response = NextResponse.redirect('/')
  response.cookies.delete('freee_access_token')
  response.cookies.delete('freee_refresh_token')
  return response
}
