# Perfume POS System

A production-ready Point of Sale system built with Next.js 14, PostgreSQL, Prisma ORM, and NextAuth authentication.

## 🚀 Features

- ✅ **Server-side rendering** with Next.js App Router
- ✅ **PostgreSQL database** with Prisma ORM
- ✅ **NextAuth authentication** with role-based access control (ADMIN, MANAGER, CASHIER)
- ✅ **Zustand state management** for cart operations
- ✅ **Shadcn/UI components** with Tailwind CSS
- ✅ **FIFO inventory tracking** for accurate cost of goods sold
- ✅ **Real-time barcode scanning** integration
- ✅ **Receipt printing** with ESC/POS commands
- ✅ **Stripe payment** integration
- ✅ **Financial reporting** with P&L statements

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- (Optional) Barcode scanner (USB keyboard wedge)
- (Optional) ESC/POS thermal printer

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd perfume-pos
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/perfume_pos"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
PRINTER_IP="192.168.1.100"
PRINTER_PORT="9100"
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 3. Setup Database

```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed initial data
npx prisma db seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 🔐 Default Login Credentials

After seeding the database:

- **Email**: admin@perfume.com
- **Password**: admin123

## 📁 Project Structure

```
perfume-pos/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Initial data
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Login page
│   │   ├── (pos)/terminal/    # POS terminal
│   │   ├── (dashboard)/admin/ # Admin pages
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # Shadcn components
│   │   ├── pos/               # POS-specific components
│   │   └── admin/             # Admin components
│   ├── lib/
│   │   ├── db/                # Prisma client
│   │   ├── actions/           # Server actions
│   │   ├── auth/              # NextAuth config
│   │   └── types/             # TypeScript types
│   ├── store/                 # Zustand stores
│   └── hooks/                 # Custom hooks
└── .env
```

## 🎯 Key Features

### FIFO Inventory Management

Orders automatically allocate inventory from oldest batches first:

1. Fetches batches ordered by `receivedDate`
2. Allocates from oldest batch first
3. Updates `remainingQty`
4. Links `OrderItem` to specific batch for COGS tracking

### Barcode Scanner Integration

- Works with USB keyboard wedge scanners
- Captures rapid keyboard input
- Triggers on Enter key
- Automatically adds products to cart

### Receipt Printing

ESC/POS commands sent to network printer:

- Text formatting (bold, size, alignment)
- Store header and order details
- Itemized list with totals
- Paper cutting
- Cash drawer opening (for cash transactions)

### Role-Based Access Control

- **ADMIN**: Full system access
- **MANAGER**: Store management + reports
- **CASHIER**: POS terminal only

## 🔧 Hardware Setup

### Receipt Printer

1. **Supported**: Any ESC/POS compatible thermal printer
2. **Connection**: Network (recommended) or USB
3. **Setup**: Set `PRINTER_IP` and `PRINTER_PORT` in `.env`

### Barcode Scanner

1. **Type**: USB keyboard wedge scanner
2. **Configuration**: Set to add Enter/Return after scan
3. **No additional software needed**

### Cash Drawer

- Connects to printer's RJ11/RJ12 port
- Opens automatically via ESC/POS command after cash payment

## 📊 Database Schema

### Key Models

- **User**: Authentication with role-based access
- **Store**: Multi-store support
- **Product**: Perfume catalog with olfactory notes
- **Variant**: SKUs with sizes/types
- **InventoryBatch**: FIFO cost tracking
- **Inventory**: Current stock levels
- **Order**: Sales transactions
- **OrderItem**: Line items with batch allocation
- **Customer**: Customer management
- **Expense**: Operating costs

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login with admin credentials
- [ ] Scan barcode at POS terminal (or type SKU + Enter)
- [ ] Add multiple items to cart
- [ ] Apply discount
- [ ] Complete cash payment
- [ ] Verify receipt prints
- [ ] Check FIFO allocation in Prisma Studio
- [ ] Generate P&L report
- [ ] Test role-based access

### Database Verification

```bash
npx prisma studio
```

Verify:
- Order created with correct totals
- OrderItems linked to correct batches
- InventoryBatch `remainingQty` decremented
- Inventory `quantity` updated

## 🚦 Production Deployment

### Build

```bash
npm run build
npm start
```

### Environment Variables

Ensure all production environment variables are set:
- Update `DATABASE_URL` to production database
- Set secure `NEXTAUTH_SECRET`
- Configure production Stripe keys
- Set printer IP addresses

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Verify PostgreSQL is running
# Check DATABASE_URL in .env
npx prisma db push
```

### Printer Not Responding

```bash
# Test printer IP connectivity
ping 192.168.1.100

# Verify printer port 9100 is open
telnet 192.168.1.100 9100
```

### Session/Auth Issues

```bash
# Regenerate NEXTAUTH_SECRET
openssl rand -base64 32

# Clear browser cookies
# Restart dev server
```

## 📚 Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/UI
- **State**: Zustand
- **Database**: PostgreSQL, Prisma ORM
- **Auth**: NextAuth.js
- **Payments**: Stripe
- **Charts**: Recharts
- **Validation**: Zod

## 📄 License

This is a proprietary Point of Sale system. All rights reserved.

## 🤝 Support

For issues or questions:
1. Check troubleshooting section
2. Review Prisma Studio for data issues
3. Check browser console for client errors
4. Review server logs for API errors

---

**Built with ❤️ using Next.js, PostgreSQL, and modern web technologies**
