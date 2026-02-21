import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Support legacy-style profile URLs: /@handle -> /handle
  if (pathname.startsWith('/@')) {
    const nextPathname = pathname.replace(/^\/@/, '/')
    const url = request.nextUrl.clone()
    url.pathname = nextPathname
    return NextResponse.redirect(url, 308)
  }

  // Keep a clean response that passes through original cookies untouched.
  // If the auth refresh fails (e.g. multi-tab race consuming the refresh
  // token), we return this instead of a response with cookie-clearing
  // headers — that way the browser keeps its existing session cookies
  // and the client-side Supabase client can attempt its own recovery.
  const cleanResponse = NextResponse.next({ request })

  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refreshes the session if expired and sets updated cookies.
    const { data: { user } } = await supabase.auth.getUser()

    // If getUser() succeeded and returned a user, the refresh worked —
    // return the response with the updated cookies.
    // If it returned null or threw, the refresh token was likely consumed
    // by another tab — return the clean response so we don't wipe out
    // the browser's existing cookies.
    if (user) {
      return response
    }
  } catch {
    // Auth refresh failed (network timeout, Supabase down, multi-tab
    // race condition, etc.) — fall through to return cleanResponse
  }

  return cleanResponse
}

export const config = {
  matcher: [
    // Run on page routes only — skip API routes, static files, and Next.js internals
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
