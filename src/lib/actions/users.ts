'use server'

import { prisma } from '@/lib/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-config'
import bcrypt from 'bcryptjs'

export async function getAllUsers() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' }
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                storeId: true,
                createdAt: true,
                updatedAt: true,
                store: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return { success: true, data: users }
    } catch (error) {
        console.error('Get users error:', error)
        return { success: false, error: 'Failed to fetch users' }
    }
}

export async function createUser(data: {
    email: string
    name: string
    password: string
    role: 'ADMIN' | 'MANAGER' | 'CASHIER'
    storeId?: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        })

        if (existingUser) {
            return { success: false, error: 'User with this email already exists' }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10)

        const user = await prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: hashedPassword,
                role: data.role,
                storeId: data.storeId || null
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                storeId: true,
                createdAt: true,
                store: {
                    select: {
                        name: true
                    }
                }
            }
        })

        return { success: true, data: user }
    } catch (error) {
        console.error('Create user error:', error)
        return { success: false, error: 'Failed to create user' }
    }
}

export async function updateUser(userId: string, data: {
    email?: string
    name?: string
    role?: 'ADMIN' | 'MANAGER' | 'CASHIER'
    storeId?: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Check if email is being changed and if it already exists
        if (data.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email: data.email }
            })
            if (existingUser && existingUser.id !== userId) {
                return { success: false, error: 'Email already in use' }
            }
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(data.email && { email: data.email }),
                ...(data.name && { name: data.name }),
                ...(data.role && { role: data.role }),
                ...(data.storeId !== undefined && { storeId: data.storeId || null })
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                storeId: true,
                createdAt: true,
                store: {
                    select: {
                        name: true
                    }
                }
            }
        })

        return { success: true, data: user }
    } catch (error) {
        console.error('Update user error:', error)
        return { success: false, error: 'Failed to update user' }
    }
}

export async function deleteUser(userId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Prevent deleting yourself
        if (userId === session.user.id) {
            return { success: false, error: 'Cannot delete your own account' }
        }

        await prisma.user.delete({
            where: { id: userId }
        })

        return { success: true }
    } catch (error) {
        console.error('Delete user error:', error)
        return { success: false, error: 'Failed to delete user' }
    }
}

export async function resetUserPassword(userId: string, newPassword: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        })

        return { success: true }
    } catch (error) {
        console.error('Reset password error:', error)
        return { success: false, error: 'Failed to reset password' }
    }
}
