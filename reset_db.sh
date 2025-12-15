#!/bin/bash

echo "🗄️ Creating fresh database for Perfume POS..."

# Extract database info from .env
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"')

# Create new database name
NEW_DB="perfume_pos_new"

echo "Creating database: $NEW_DB"
createdb $NEW_DB 2>/dev/null || echo "Database may already exist"

# Update .env with new database
sed -i.bak "s|pos_perfume|$NEW_DB|g" .env

echo "✅ Updated .env to use database: $NEW_DB"
echo ""
echo "Now run:"
echo "  npx prisma db push"
echo "  npx prisma db seed"
