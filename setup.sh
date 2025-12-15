#!/bin/bash

# Perfume POS System - Quick Setup Script

echo "🚀 Perfume POS System - Quick Setup"
echo "===================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file"
        echo ""
        echo "⚠️  IMPORTANT: Please update the following in .env:"
        echo "   1. DATABASE_URL with your PostgreSQL connection"
        echo "   2. NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
        echo "   3. Stripe keys (if using Stripe)"
        echo "   4. Printer IP (if using receipt printer)"
        echo ""
        read -p "Press Enter after updating .env to continue..."
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️  Setting up database..."
echo "Generating Prisma Client..."
npx prisma generate

echo ""
echo "⚠️  IMPORTANT: Make sure your PostgreSQL database exists!"
echo "   Database name from your DATABASE_URL should exist"
echo ""
read -p "Press Enter when ready to push schema to database..."

echo ""
echo "Pushing schema to database..."
if npx prisma db push; then
    echo "✅ Schema pushed successfully!"
else
    echo "❌ Failed to push schema. Please check your DATABASE_URL and database connection."
    exit 1
fi

echo ""
echo "🌱 Seeding database with initial data..."
if npx prisma db seed; then
    echo "✅ Database seeded successfully!"
else
    echo "❌ Failed to seed database."
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Run: npm run dev"
echo "   2. Visit: http://localhost:3000"
echo "   3. Login with:"
echo "      Email: admin@perfume.com"
echo "      Password: admin123"
echo ""
echo "📚 For more information, see README.md"
