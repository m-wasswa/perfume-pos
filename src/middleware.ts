import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const path = req.nextUrl.pathname

        // Admin routes
        if (path.startsWith('/admin')) {
            if (token?.role !== 'ADMIN' && token?.role !== 'MANAGER') {
                return NextResponse.redirect(new URL('/terminal', req.url))
            }
        }

        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token
        },
    }
)

export const config = {
    matcher: ['/terminal/:path*', '/admin/:path*']
}
