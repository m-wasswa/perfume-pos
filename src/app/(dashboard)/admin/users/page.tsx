'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAllUsers, createUser, updateUser, deleteUser, resetUserPassword } from '@/lib/actions/users'
import { toast } from 'sonner'
import { Edit2, Trash2, Plus, Loader2, Mail, Shield, Building, Calendar, Key } from 'lucide-react'

type User = {
    id: string
    email: string
    name: string
    role: 'ADMIN' | 'MANAGER' | 'CASHIER'
    storeId: string | null
    createdAt: Date
    updatedAt: Date
    store?: {
        id: string
        name: string
    } | null
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [deletingUser, setDeletingUser] = useState<string | null>(null)
    const [resetingPassword, setResetingPassword] = useState<string | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'CASHIER' as 'ADMIN' | 'MANAGER' | 'CASHIER',
    })

    // Fetch users on component mount
    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setIsLoading(true)
        try {
            const result = await getAllUsers()
            if (result.success && result.data) {
                setUsers(result.data)
            } else {
                setUsers([])
                toast.error(result.error || 'Failed to fetch users')
            }
        } catch (error) {
            toast.error('Failed to fetch users')
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddUser = async () => {
        if (!formData.name || !formData.email || !formData.password) {
            toast.error('Please fill in all fields')
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createUser({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            })

            if (result.success) {
                toast.success('User created successfully')
                setShowAddModal(false)
                setFormData({ name: '', email: '', password: '', role: 'CASHIER' })
                fetchUsers()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('Failed to create user')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdateUser = async () => {
        if (!editingUser) return

        setIsSubmitting(true)
        try {
            const result = await updateUser(editingUser.id, {
                name: formData.name,
                email: formData.email,
                role: formData.role,
            })

            if (result.success) {
                toast.success('User updated successfully')
                setEditingUser(null)
                setFormData({ name: '', email: '', password: '', role: 'CASHIER' })
                fetchUsers()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('Failed to update user')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteUser = async () => {
        if (!deletingUser) return

        setIsSubmitting(true)
        try {
            const result = await deleteUser(deletingUser)
            if (result.success) {
                toast.success('User deleted successfully')
                setDeletingUser(null)
                fetchUsers()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('Failed to delete user')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResetPassword = async () => {
        if (!resetingPassword || !newPassword) {
            toast.error('Please enter a new password')
            return
        }

        setIsSubmitting(true)
        try {
            const result = await resetUserPassword(resetingPassword, newPassword)
            if (result.success) {
                toast.success('Password reset successfully')
                setResetingPassword(null)
                setNewPassword('')
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('Failed to reset password')
        } finally {
            setIsSubmitting(false)
        }
    }

    const openEditModal = (user: User) => {
        setEditingUser(user)
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold dark:text-white">User Management</h1>
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">Manage staff and admin accounts</p>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add User
                </Button>
            </div>

            {/* Users Table */}
            <Card className="dark:bg-gray-800 dark:border-gray-700 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Name</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Email</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Role</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Store</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Created</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            user.role === 'ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                            user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{user.store?.name || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm space-x-2 flex">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditModal(user)}
                                            className="gap-1"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setResetingPassword(user.id)}
                                            className="gap-1 text-orange-600 dark:text-orange-400"
                                        >
                                            <Key className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setDeletingUser(user.id)}
                                            className="gap-1 text-red-600 dark:text-red-400"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add/Edit User Modal */}
            {(showAddModal || editingUser) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md p-6 dark:bg-gray-800 dark:border-gray-700 bg-white">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">{editingUser ? 'Edit User' : 'Add New User'}</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-200">Name *</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Full name"
                                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-200">Email *</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="user@example.com"
                                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-200">Password *</label>
                                    <Input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Enter password"
                                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-200">Role *</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                    className="w-full px-3 py-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md"
                                >
                                    <option value="CASHIER">Cashier</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <Button
                                onClick={() => {
                                    if (editingUser) {
                                        setEditingUser(null)
                                    } else {
                                        setShowAddModal(false)
                                    }
                                    setFormData({ name: '', email: '', password: '', role: 'CASHIER' })
                                }}
                                variant="outline"
                                className="flex-1"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={editingUser ? handleUpdateUser : handleAddUser}
                                className="flex-1"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    editingUser ? 'Update User' : 'Create User'
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md p-6 dark:bg-gray-800 dark:border-gray-700 bg-white">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Delete User?</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this user? This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setDeletingUser(null)}
                                variant="outline"
                                className="flex-1"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteUser}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetingPassword && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md p-6 dark:bg-gray-800 dark:border-gray-700 bg-white">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Reset Password</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-200">New Password *</label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button
                                onClick={() => {
                                    setResetingPassword(null)
                                    setNewPassword('')
                                }}
                                variant="outline"
                                className="flex-1"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleResetPassword}
                                className="flex-1"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Resetting...
                                    </>
                                ) : (
                                    'Reset Password'
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
