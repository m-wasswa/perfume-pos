'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, DollarSign, Calendar, Loader2 } from 'lucide-react'
import { getExpenses, createExpense } from '@/lib/actions/expenses'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils/formatters'

export default function ExpensesPage() {
    const [showAddForm, setShowAddForm] = useState(false)
    const [expenses, setExpenses] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const fetchExpenses = async () => {
        setIsLoading(true)
        try {
            const result = await getExpenses()
            if (result.success && result.expenses) {
                setExpenses(result.expenses)
            } else {
                toast.error('Failed to fetch expenses')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchExpenses()
    }, [])

    const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)
        const data = {
            category: formData.get('category') as string,
            amount: parseFloat(formData.get('amount') as string),
            vendor: formData.get('vendor') as string,
            date: formData.get('date') as string,
            description: formData.get('description') as string || '',
        }

        try {
            const result = await createExpense(data)
            if (result.success) {
                toast.success('Expense added successfully')
                setShowAddForm(false)
                fetchExpenses()
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to add expense')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    const categoryColors: Record<string, string> = {
        RENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        SALARIES: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        UTILITIES: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        MARKETING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        SUPPLIES: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
        OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Expenses</h1>
                    <p className="text-gray-500 dark:text-gray-400">Track and manage business expenses</p>
                </div>
                <Button size="lg" onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus className="mr-2 h-5 w-5" />
                    Add Expense
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Expenses</p>
                            <h3 className="text-2xl font-bold dark:text-white">{formatCurrency(totalExpenses)}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This month</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-red-500" />
                    </div>
                </Card>
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Transactions</p>
                            <h3 className="text-2xl font-bold dark:text-white">{expenses.length}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This month</p>
                        </div>
                        <Calendar className="h-8 w-8 text-blue-500" />
                    </div>
                </Card>
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Average Expense</p>
                            <h3 className="text-2xl font-bold dark:text-white">
                                {formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Per transaction</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-purple-500" />
                    </div>
                </Card>
            </div>

            {/* Add Expense Form */}
            {showAddForm && (
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Add New Expense</h2>
                    <form onSubmit={handleAddExpense} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 dark:text-gray-200">Category *</label>
                                <select name="category" className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                                    <option value="RENT">Rent</option>
                                    <option value="SALARIES">Salaries</option>
                                    <option value="UTILITIES">Utilities</option>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="SUPPLIES">Supplies</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 dark:text-gray-200">Amount *</label>
                                <Input name="amount" type="number" step="0.01" placeholder="0.00" required className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 dark:text-gray-200">Vendor *</label>
                                <Input name="vendor" placeholder="Vendor name" required className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 dark:text-gray-200">Date *</label>
                                <Input name="date" type="date" required className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2 dark:text-gray-200">Description *</label>
                                <Input name="description" placeholder="Expense description" required className="dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-4">
                            <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Adding...' : 'Add Expense'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Expenses List */}
            <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Recent Expenses</h2>
                <div className="space-y-3">
                    {expenses.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">No expenses recorded</p>
                    ) : (
                        expenses.map((expense) => (
                            <div
                                key={expense.id}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-1">
                                        <Badge className={categoryColors[expense.category] || categoryColors.OTHER}>
                                            {expense.category}
                                        </Badge>
                                        <p className="font-medium dark:text-white">{expense.description}</p>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                        <span>{expense.notes?.replace('Vendor: ', '') || 'Unknown Vendor'}</span>
                                        <span>•</span>
                                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-red-600 dark:text-red-400">-{formatCurrency(Number(expense.amount))}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    )
}
