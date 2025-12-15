#!/bin/bash

# Generate NEXTAUTH_SECRET
SECRET=$(openssl rand -base64 32)

# Update .env file
if grep -q "NEXTAUTH_SECRET=" .env; then
    # Replace existing
    sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$SECRET\"|" .env
else
    # Add new
    echo "NEXTAUTH_SECRET=\"$SECRET\"" >> .env
fi

echo "✅ NEXTAUTH_SECRET added to .env"
echo ""
echo "Secret: $SECRET"
echo ""
echo "⚠️  Please restart the dev server:"
echo "   Ctrl+C to stop"
echo "   npm run dev to restart"
