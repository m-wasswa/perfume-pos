'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Upload, Store as StoreIcon } from 'lucide-react'
import { toast } from 'sonner'

interface StoreSettings {
    id: string
    name: string
    address: string
    phone: string
    taxRate: number
    logo?: string
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<StoreSettings | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings')
            if (response.ok) {
                const data = await response.json()
                setSettings(data.store)
                if (data.store.logo) {
                    setLogoPreview(data.store.logo)
                }
            }
        } catch (error) {
            toast.error('Failed to load settings')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Create preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!settings) return

        setIsSaving(true)
        try {
            const formData = new FormData(e.currentTarget)
            const data = {
                name: formData.get('name') as string,
                address: formData.get('address') as string,
                phone: formData.get('phone') as string,
                taxRate: parseFloat(formData.get('taxRate') as string) / 100, // Convert percentage to decimal
                logo: logoPreview
            }

            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (response.ok) {
                toast.success('Settings updated successfully')
                fetchSettings()
            } else {
                toast.error('Failed to update settings')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!settings) {
        return (
            <div className="p-6">
                <div className="text-center text-gray-500 dark:text-gray-400">
                    No store settings found
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your store settings and preferences</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Business Information */}
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white flex items-center">
                        <StoreIcon className="h-5 w-5 mr-2 text-blue-600" />
                        Business Information
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name" className="dark:text-gray-200">Business Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={settings.name}
                                required
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <Label htmlFor="address" className="dark:text-gray-200">Address *</Label>
                            <Input
                                id="address"
                                name="address"
                                defaultValue={settings.address}
                                required
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <Label htmlFor="phone" className="dark:text-gray-200">Phone Number *</Label>
                            <Input
                                id="phone"
                                name="phone"
                                defaultValue={settings.phone}
                                required
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>
                </Card>

                {/* Tax Settings */}
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Tax Settings</h2>
                    <div>
                        <Label htmlFor="taxRate" className="dark:text-gray-200">Tax Rate (%) *</Label>
                        <Input
                            id="taxRate"
                            name="taxRate"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            defaultValue={(settings.taxRate * 100).toFixed(2)}
                            required
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Current rate: {(settings.taxRate * 100).toFixed(2)}%
                        </p>
                    </div>
                </Card>

                {/* Logo Upload */}
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Business Logo</h2>
                    <div className="space-y-4">
                        {logoPreview && (
                            <div className="flex justify-center">
                                <img
                                    src={logoPreview}
                                    alt="Logo preview"
                                    className="h-32 w-32 object-contain border-2 border-gray-200 dark:border-gray-600 rounded-lg p-2"
                                />
                            </div>
                        )}
                        <div>
                            <Label htmlFor="logo" className="dark:text-gray-200">Upload Logo</Label>
                            <div className="mt-2">
                                <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                                    <div className="text-center">
                                        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            PNG, JPG up to 2MB
                                        </p>
                                    </div>
                                    <input
                                        id="logo"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        size="lg"
                        disabled={isSaving}
                        className="min-w-[150px]"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
