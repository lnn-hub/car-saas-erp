#!/bin/bash
# Car SaaS ERP — Local дээр эхлүүлэх

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

echo "🚀 PostgreSQL эхлүүлж байна..."
brew services start postgresql@16

echo "🔧 Backend эхлүүлж байна (port 4001)..."
cd backend && npm run dev &
BACKEND_PID=$!

echo "🌐 Frontend эхлүүлж байна (port 3000)..."
cd ../frontend && node_modules/.bin/next dev --turbopack &
FRONTEND_PID=$!

echo ""
echo "✅ Бүгд ажиллаж байна!"
echo "   Backend:  http://localhost:4001"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Зогсоохын тулд Ctrl+C дарна уу"

trap "kill $BACKEND_PID $FRONTEND_PID; echo 'Зогссон.'" EXIT
wait
