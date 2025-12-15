import { Suspense } from 'react'
import InventoryContent from './inventory-content'

export default function InventoryPage() {
    return (
        <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
            <InventoryContent />
        </Suspense>
    )

}
