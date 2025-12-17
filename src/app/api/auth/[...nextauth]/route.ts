import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth/auth-config"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

export const dynamic = 'force-dynamic'

// Add error handler wrapper for better error handling
export const maxDuration = 30
