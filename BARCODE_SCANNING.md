# Barcode Scanning Implementation Guide

## Overview
The perfume POS system now supports barcode scanning for products. Each product variant can have both a SKU (internal identifier) and a barcode (typically from product packaging).

## Database Changes
- Added `barcode` field to the `Variant` model
- The barcode field is optional and unique
- Added an index on the barcode field for faster lookups

## Features Implemented

### 1. Product Creation & Editing
When creating or editing a product variant, you can now add a barcode number:
- **SKU** (required): Internal identifier (e.g., CHANEL-NO5-50ML)
- **Barcode** (optional): Product barcode from packaging (e.g., 3614270053124)

### 2. Barcode Scanner Hook Enhancement
The `useBarcodeScanner` hook has been updated to:
- Detect both barcode and SKU scanning
- Automatically differentiate based on length (barcodes are typically > 12 characters)
- Return both the scanned value and its type

### 3. POS Terminal Scanning
In the POS terminal, when you scan a product:
- If it's a barcode (>12 characters), the system searches by barcode
- If it's a SKU (≤12 characters), the system searches by SKU
- The product is automatically added to the cart if found

### 4. API Endpoints
Two endpoints are available for product lookup:
- `/api/products/by-sku/[sku]` - Get product by SKU
- `/api/products/by-barcode/[barcode]` - Get product by barcode

### 5. Server Actions
New server action available in `src/lib/actions/products.ts`:
- `getProductByBarcode(barcode: string)` - Fetch product by barcode

## Usage

### Creating a Product with Barcode
1. Go to Admin → Products → New Product
2. Add product details (brand, name, category, etc.)
3. In the Variants section:
   - Fill in Size, Type, SKU (required)
   - **Add Barcode** (optional but recommended)
   - Fill in Retail Price
   - Mark as Tester if applicable
4. Click Create Product

### Scanning in POS Terminal
1. Go to POS → Terminal
2. Have a barcode scanner ready (can use any USB/Bluetooth barcode scanner)
3. Simply scan the product barcode or enter the SKU
4. Press Enter to complete the scan
5. The product will automatically be added to the cart

### Generating Barcodes
You can:
- Use existing product barcodes from packaging
- Generate new barcodes using free barcode generator tools online
- Assign standard barcodes (EAN-13, Code-128, etc.)

## Database Schema
```
model Variant {
  id            String      @id @default(cuid())
  productId     String
  sku           String      @unique
  barcode       String?     @unique
  size          String
  type          String
  retailPrice   Float
  isTester      Boolean     @default(false)
  ...
  @@index([sku])
  @@index([barcode])
}
```

## Technical Details

### How Barcode Detection Works
The system uses length-based detection:
- **Barcode**: Typically 12-14+ characters (EAN-13, UPC-A, etc.)
- **SKU**: Usually shorter internal codes (< 12 characters)

This ensures that:
- Product barcodes from packaging work automatically
- Internal SKUs still function as expected
- No configuration needed from the user

### Performance
- Both SKU and barcode lookups use database indexes
- Query performance is optimized for real-time POS use
- Unique constraints prevent duplicate barcodes

## Best Practices

1. **Use Real Barcodes**: When possible, use actual product barcodes from packaging
2. **Keep SKUs Short**: Keep SKUs relatively short for easy manual entry
3. **Test Before Deployment**: Test barcode scanners with your POS system
4. **Backup Data**: Always maintain database backups before migrations
5. **Document Barcodes**: Keep a record of which barcodes are assigned to which products

## Troubleshooting

### Product Not Found When Scanning
- Verify the barcode/SKU is correctly entered in the product
- Check that the variant record was saved properly
- Ensure the barcode is unique (no duplicates)

### Scanner Not Working
- Check USB/Bluetooth connection
- Verify scanner is emitting Enter key after barcode
- Test with a manual keyboard entry first
- Check if the barcode format is supported

## Future Enhancements

Potential features for future implementation:
- Barcode generation (automatic QR codes)
- Batch barcode printing
- Multiple barcodes per variant
- Barcode history/tracking
- Barcode validation
