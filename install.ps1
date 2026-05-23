Write-Host "=== Installing PrivetVideo Backend ===" -ForegroundColor Cyan
Set-Location backend
npm install

Write-Host ""
Write-Host "=== Installing PrivetVideo Frontend ===" -ForegroundColor Cyan
Set-Location ../frontend
npm install

Write-Host ""
Write-Host "✅ All dependencies installed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy backend\.env.example to backend\.env and fill in your credentials"
Write-Host "2. Create frontend\.env with VITE_GOOGLE_CLIENT_ID=..."
Write-Host "3. Terminal 1: cd backend && npm run dev"
Write-Host "4. Terminal 2: cd frontend && npm run dev"
Write-Host ""
Write-Host "Open http://localhost:5173 in your browser." -ForegroundColor Green
