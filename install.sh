#!/bin/bash
echo "=== Installing PrivetVideo Backend ==="
cd backend
npm install

echo ""
echo "=== Installing PrivetVideo Frontend ==="
cd ../frontend
npm install

echo ""
echo "✅ All dependencies installed!"
echo ""
echo "Next steps:"
echo "1. Copy backend/.env.example to backend/.env and fill in your credentials"
echo "2. Create frontend/.env with VITE_GOOGLE_CLIENT_ID=..."
echo "3. Run: cd backend && npm run dev"
echo "4. Run: cd frontend && npm run dev (in another terminal)"
