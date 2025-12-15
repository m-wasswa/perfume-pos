'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
    LayoutDashboard,
    Package,
    Warehouse,
    FileText,
    DollarSign,
    LogOut,
    Store,
    User,
    ChevronLeft,
    ChevronRight,
    Settings as SettingsIcon,
    Menu,
    X,
    Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Inventory', href: '/admin/inventory', icon: Warehouse },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
    { name: 'Expenses', href: '/admin/expenses', icon: DollarSign },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
]

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Desktop Sidebar - Hidden on mobile */}
            <div className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out relative`}>
                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-6 z-10 h-6 w-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-md"
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                        <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    )}
                </button>

                {/* Logo */}
                <div className="p-6 border-b dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Store className="h-8 w-8 text-blue-600 flex-shrink-0" />
                            {!isCollapsed && (
                                <div className="overflow-hidden">
                                    <h1 className="text-xl font-bold dark:text-white whitespace-nowrap">Perfume POS</h1>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Admin Panel</p>
                                </div>
                            )}
                        </div>
                        {!isCollapsed && <ThemeToggle />}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname?.startsWith(item.href)
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.name}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t dark:border-gray-700">
                    {isCollapsed ? (
                        <div className="flex flex-col items-center space-y-2">
                            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-10 h-10 p-0 dark:border-gray-600 dark:hover:bg-gray-600"
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <Card className="p-4 dark:bg-gray-700 dark:border-gray-600">
                            <div className="flex items-center space-x-3 mb-3">
                                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate dark:text-white">{session?.user?.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full dark:border-gray-600 dark:hover:bg-gray-600"
                                onClick={() => signOut({ callbackUrl: '/login' })}
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </Card>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-auto">
                {/* Mobile Header */}
                <div className="md:hidden bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center space-x-2">
                        <Store className="h-6 w-6 text-blue-600" />
                        <h1 className="text-lg font-bold dark:text-white">Perfume POS</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="dark:text-gray-300"
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white dark:bg-gray-800 border-b dark:border-gray-700 absolute top-16 left-0 right-0 z-10 shadow-lg">
                        <nav className="p-4 space-y-1">
                            {navigation.map((item) => {
                                const isActive = pathname?.startsWith(item.href)
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <item.icon className="h-5 w-5 flex-shrink-0" />
                                        <span className="font-medium">{item.name}</span>
                                    </Link>
                                )
                            })}
                            <div className="border-t dark:border-gray-700 pt-3 mt-3">
                                <Button
                                    variant="outline"
                                    className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                                    onClick={() => {
                                        signOut({ callbackUrl: '/login' })
                                        setIsMobileMenuOpen(false)
                                    }}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
                                </Button>
                            </div>
                        </nav>
                    </div>
                )}

                {/* Page Content */}
                {children}
            </div>

            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-5 top-16"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    )
}
