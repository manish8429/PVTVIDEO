# PrivetVideo — Private Video Sharing Platform

A full-stack MERN application with React + Vite frontend. Share private videos with token-gated access.

## Features

- 🔐 Gmail-only authentication (OTP + Google OAuth)
- 📹 Video upload to Cloudinary (up to 500MB)
- 🔑 API token generation with usage limits (1–1000)
- 📊 Dashboard with usage analytics per video
- 🛡️ Full security: JWT, httpOnly cookies, bcrypt, rate limiting, helmet

## Project Structure

```
privetvideosite/
├── backend/          # Express + MongoDB API
│   ├── models/       # User, Video, ApiKey schemas
│   ├── routes/       # Auth, Video, ApiKey, User routes
│   ├── middleware/   # JWT auth middleware
│   ├── config/       # Cloudinary config
│   └── utils/        # Email (OTP) utility
└── frontend/         # React + Vite + TypeScript
    └── src/
        ├── pages/    # Login, Register, OTP, Dashboard, Upload, VideoDetail, Watch
        ├── store/    # Zustand auth store
        ├── lib/      # Axios API client
        └── components/
```

## Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend** — copy `.env.example` to `.env` and fill in:

```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=min_32_char_secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
GOOGLE_CLIENT_ID=...
GMAIL_USER=yourapp@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
CLIENT_URL=http://localhost:5173
```

**Frontend** — create `frontend/.env`:
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### 3. Gmail App Password Setup

1. Enable 2-Step Verification in your Google Account
2. Go to Security → App passwords
3. Create app password for "Mail"
4. Paste the 16-char password as `GMAIL_APP_PASSWORD`

### 4. Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:5173

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register with email+password |
| POST | /api/auth/verify-otp | — | Verify email OTP |
| POST | /api/auth/login | — | Email+password login |
| POST | /api/auth/google | — | Google OAuth login |
| POST | /api/auth/logout | Cookie | Logout |
| GET | /api/auth/me | JWT | Get current user |
| POST | /api/videos/upload | JWT | Upload video to Cloudinary |
| GET | /api/videos | JWT | List my videos + API stats |
| GET | /api/videos/:id | JWT | Video detail + API keys |
| DELETE | /api/videos/:id | JWT | Delete video + all tokens |
| GET | /api/videos/dashboard/stats | JWT | Aggregate dashboard stats |
| POST | /api/apikeys/generate | JWT | Generate token for video |
| GET | /api/apikeys/video/:videoId | JWT | List tokens for video |
| DELETE | /api/apikeys/:id | JWT | Delete token |
| PATCH | /api/apikeys/:id/toggle | JWT | Toggle active state |
| GET | /api/watch/:videoId | Token | Watch video via token |

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT stored in httpOnly cookie + localStorage fallback
- Account lockout after 5 failed login attempts (30 min)
- OTP expires after 10 minutes, max 5 attempts
- Rate limiting on auth routes (20 req/15min)
- Global rate limiter (200 req/15min)
- Helmet for HTTP security headers
- Gmail-only email validation (frontend + backend)
- CORS restricted to CLIENT_URL
