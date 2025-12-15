'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                toast.error('Invalid credentials')
            } else {
                toast.success('Login successful')
                // Fetch user session to check role
                const sessionRes = await fetch('/api/auth/session')
                const session = await sessionRes.json()
                
                // Redirect based on role
                if (session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER') {
                    router.push('/admin/dashboard')
                } else {
                    router.push('/terminal')
                }
                router.refresh()
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <Card className="w-full max-w-md p-8 dark:bg-gray-800 dark:border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Perfume POS</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 dark:text-gray-200">Email</label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@perfume.com"
                            required
                            disabled={isLoading}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 dark:text-gray-200">Password</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>Demo credentials:</p>
                    <p className="font-mono">admin@perfume.com / admin123</p>
                </div>
            </Card>
        </div>
    )
}
