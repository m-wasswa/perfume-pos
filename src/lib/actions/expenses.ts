'use server'

import { prisma } from "@/lib/db/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { ExpenseCategory } from "@prisma/client"

const expenseSchema = z.object({
    category: z.string().min(1),
    amount: z.number().positive(),
    description: z.string().optional().default(''),
    date: z.string().or(z.date()),
    vendor: z.string().min(1),
})

export async function getExpenses() {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: {
                date: 'desc'
            }
        })

        return { success: true, expenses }
    } catch (error) {
        return { success: false, error: 'Failed to fetch expenses' }
    }
}

export async function createExpense(data: z.infer<typeof expenseSchema>) {
    try {
        const validated = expenseSchema.parse(data)

        // Validate category
        if (!Object.values(ExpenseCategory).includes(validated.category as ExpenseCategory)) {
            return { success: false, error: 'Invalid category. Valid categories are: RENT, SALARIES, UTILITIES, MARKETING, SUPPLIES, OTHER' }
        }

        const expense = await prisma.expense.create({
            data: {
                category: validated.category as ExpenseCategory,
                amount: validated.amount,
                description: validated.description || 'No description',
                date: new Date(validated.date),
                notes: `Vendor: ${validated.vendor}` // Map vendor to notes as per schema
            }
        })

        revalidatePath('/admin/expenses')
        return { success: true, expense }
    } catch (error) {
        console.error('Create expense error:', error)
        return { success: false, error: 'Failed to create expense' }
    }
}
