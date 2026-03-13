# 🎭 Imposter Game — Fullstack

**Texnologiyalar:** React + NestJS + PostgreSQL + Socket.io  
**Muallif:** Umaraliyev Usmon

---

## 📁 Loyiha tuzilmasi

```
imposter-game/
├── frontend/          ← React + Vite + TypeScript
│   └── src/
│       ├── pages/     ← Home, Auth, Profile, Room, GameChat
│       ├── components/← Header, UI components
│       ├── services/  ← api.ts (HTTP), socket.ts (WebSocket)
│       ├── store/     ← Zustand global state
│       └── hooks/     ← useGame (socket → store)
│
├── backend/           ← NestJS + TypeORM + Socket.io
│   └── src/
│       ├── auth/      ← JWT, Google OAuth, Phone OTP
│       ├── users/     ← Profil, avatar, parol
│       ├── rooms/     ← Xona yaratish, kirish
│       └── game/      ← Gateway, service, entities
│
└── docker-compose.yml ← Barcha servislar
```

---

## 🚀 Ishga tushirish

### 1. Talab qilinuvchi dasturlar
- Node.js 20+
- Docker & Docker Compose

### 2. Environment sozlamalari

```bash
# Backend .env yaratish
cp backend/.env.example backend/.env
```

`backend/.env` faylini tahrirlang:

```env
# Majburiy — o'zgartiring!
JWT_ACCESS_SECRET=kamida-32-belgili-maxfiy-kalit-kiriting
JWT_REFRESH_SECRET=boshqa-32-belgili-maxfiy-kalit-kiriting

# Google OAuth (https://console.cloud.google.com → Credentials → OAuth 2.0)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Twilio (https://twilio.com) — development'da ixtiyoriy, kod console'ga chiqadi
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Cloudinary (https://cloudinary.com) — avatar uchun
CLOUDINARY_CLOUD_NAME=your-name
CLOUDINARY_API_KEY=123456
CLOUDINARY_API_SECRET=xxxxxx
```

### 3. Docker bilan ishga tushirish (tavsiya)

```bash
cd backend
docker-compose up -d
```

Bu buyruq quyidagilarni ishga tushiradi:
- PostgreSQL (port 5432)
- Redis (port 6379)
- NestJS backend (port 3001)

### 4. Frontend ishga tushirish

```bash
cd frontend
npm install
npm run dev
```

**Frontend:** http://localhost:3000  
**Backend API:** http://localhost:3001/api  
**Swagger docs:** http://localhost:3001/api/docs

---

## 🔗 Frontend–Backend ulanish

Vite proxy orqali frontend backend bilan avtomatik ulangan:

```typescript
// vite.config.ts
proxy: {
  '/api': 'http://localhost:3001',      // HTTP requests
  '/socket.io': { target: '...', ws: true } // WebSocket
}
```

Frontend kodda faqat `/api` ishlatiladi — to'g'ridan CORS muammosi bo'lmaydi.

---

## 🎮 O'yin jarayoni

```
1. Foydalanuvchi ro'yxatdan o'tadi (Google yoki telefon)
2. Bosh sahifada "Imposter" → "O'ynash" bosadi
3. Xona yaratadi (sozlamalar) yoki mavjudiga kiradi (kod)
4. Lobby → do'stlarni taklif qiladi
5. Host "O'yinni boshlash" bosadi (min 3 kishi)
6. Har bir o'yinchi o'z so'zini ko'radi
7. Navbat tartibida chat orqali gaplashadi (60s/navbat)
8. Kimdir "🗳️ OVOZ" bosadi → ovoz berish boshlanadi
9. Imposter topilsa → o'yinchilar yutadi
10. Topilmasa va vaqt tugasa → Imposter yutadi
```

---

## 📡 WebSocket Events

| Client → Server | Ma'no |
|----------------|-------|
| `join_room` | Xonaga kirish |
| `start_game` | O'yinni boshlash (host) |
| `send_message` | Xabar yuborish |
| `skip_turn` | Navbatni o'tkazish |
| `cast_vote` | Ovoz berish |
| `start_voting` | Ovoz bosqichini boshlash |

| Server → Client | Ma'no |
|----------------|-------|
| `game_started` | O'yin boshlandi + so'z |
| `new_message` | Yangi xabar |
| `turn_changed` | Navbat o'zgardi |
| `voting_resolved` | Ovoz natijasi |
| `game_ended` | O'yin tugadi |

---

## 🛠 Development maslahatlar

- **OTP:** `NODE_ENV=development` bo'lsa SMS yuborilmaydi, kod console'da chiqadi
- **Avatar:** Cloudinary sozlanmasa, dicebear.com dan avtomatik avatar
- **DB:** `DB_SYNCHRONIZE=true` — schema avtomatik yaratiladi (prod'da false qiling)

---

*Imposter Game v1.0.0 | Umaraliyev Usmon*
