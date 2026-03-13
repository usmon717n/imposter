# 🎭 Imposter Game — Backend

NestJS asosidagi multiplayer o'yin backend'i. WebSocket orqali real-time o'yin.

## Texnologiyalar

| Texnologiya | Versiya | Maqsad |
|------------|---------|--------|
| NestJS | 10 | Backend framework |
| PostgreSQL | 16 | Asosiy ma'lumotlar bazasi |
| TypeORM | 0.3 | ORM |
| Socket.io | 4 | Real-time WebSocket |
| JWT | - | Autentifikatsiya |
| Passport.js | - | Google OAuth |
| Twilio | - | SMS OTP |
| Cloudinary | - | Avatar rasmlar |
| Redis | 7 | Cache (session, OTP) |

---

## Tezkor ishga tushirish (Docker bilan)

```bash
# 1. Loyihani clone qilish
git clone <repo-url>
cd imposter-backend

# 2. .env fayl yaratish
cp .env.example .env
# .env faylni o'zgartiring (JWT secret, Google credentials, ...)

# 3. Docker bilan ishga tushirish
docker-compose up -d

# Backend: http://localhost:3001
# Swagger: http://localhost:3001/api/docs
```

---

## Manual ishga tushirish (Development)

```bash
# 1. Dependencies o'rnatish
npm install

# 2. .env fayl yaratish
cp .env.example .env

# 3. PostgreSQL va Redis ishga tushirish (Docker)
docker-compose up postgres redis -d

# 4. Backend'ni dev rejimda ishga tushirish
npm run start:dev
```

---

## .env Sozlamalar

```env
# Majburiy
JWT_ACCESS_SECRET=<kamida-32-belgili-maxfiy-kalit>
JWT_REFRESH_SECRET=<kamida-32-belgili-boshqa-kalit>

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Twilio SMS (https://twilio.com) — development'da ixtiyoriy
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Cloudinary (https://cloudinary.com) — avatar uchun
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Frontend bilan ulash

### 1. API Service faylini frontend'ga qo'shing

```
frontend/
  src/
    services/
      api.service.ts      ← src/frontend-api.service.ts dan nusxa oling
      socket.service.ts   ← src/frontend-socket.service.ts dan nusxa oling
```

### 2. Vite .env sozlamalari (frontend)

```env
# frontend/.env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

### 3. Socket.io client o'rnatish

```bash
cd frontend
npm install socket.io-client
```

---

## API Endpoints

### Auth
| Method | URL | Tavsif |
|--------|-----|--------|
| GET | /api/auth/google | Google OAuth boshlash |
| GET | /api/auth/google/callback | Google OAuth callback |
| POST | /api/auth/phone/send | SMS OTP yuborish |
| POST | /api/auth/phone/verify | OTP tasdiqlash |
| POST | /api/auth/set-nickname | Nickname belgilash |
| POST | /api/auth/refresh | Token yangilash |
| POST | /api/auth/logout | Chiqish |
| GET | /api/auth/me | Joriy foydalanuvchi |

### Users
| Method | URL | Tavsif |
|--------|-----|--------|
| GET | /api/users/me | O'z profili |
| PUT | /api/users/me | Profilni yangilash |
| PUT | /api/users/me/password | Parol o'zgartirish |
| PUT | /api/users/me/avatar | Avatar yuklash |
| POST | /api/users/check-nickname | Nickname mavjudligi |
| GET | /api/users/:nickname | Boshqa foydalanuvchi |

### Rooms
| Method | URL | Tavsif |
|--------|-----|--------|
| POST | /api/rooms | Xona yaratish |
| POST | /api/rooms/join | Xonaga kirish |
| GET | /api/rooms/:code | Xona ma'lumoti |
| POST | /api/rooms/:id/invite | Taklif yuborish |
| DELETE | /api/rooms/:id/leave | Xonadan chiqish |

---

## WebSocket Events

### Client → Server

| Event | Payload | Tavsif |
|-------|---------|--------|
| `join_room` | `{ roomCode }` | Xonaga kirish |
| `leave_room` | `{ roomId }` | Xonadan chiqish |
| `start_game` | `{ roomId }` | O'yinni boshlash (host) |
| `send_message` | `{ roomId, message }` | Xabar yuborish |
| `skip_turn` | `{ roomId }` | Navbatni o'tkazib yuborish |
| `cast_vote` | `{ roomId, targetPlayerId }` | Ovoz berish |
| `start_voting` | `{ roomId }` | Ovoz berish bosqichini boshlash |

### Server → Client

| Event | Payload | Tavsif |
|-------|---------|--------|
| `room_state` | `RoomData` | Xona holati |
| `player_joined` | `{ player }` | Yangi o'yinchi |
| `player_left` | `{ userId }` | O'yinchi ketdi |
| `player_disconnected` | `{ userId }` | O'yinchi uzildi |
| `game_started` | `{ word, isImposter, players, durationSeconds }` | O'yin boshlandi |
| `game_phase_changed` | `{ phase, currentTurnUserId, turnEndsAt }` | Faza o'zgardi |
| `new_message` | `{ id, userId, nickname, message, timestamp }` | Yangi xabar |
| `turn_changed` | `{ currentTurnUserId, turnNumber, turnEndsAt }` | Navbat o'zgardi |
| `turn_skipped` | `{ skippedUserId, nextTurnUserId, autoSkipped }` | Navbat o'tkazildi |
| `voting_started` | `{ startedBy, endsAt }` | Ovoz berish boshlandi |
| `vote_cast` | `{ voterId, targetPlayerId, voteCounts }` | Ovoz berildi |
| `voting_resolved` | `{ eliminatedPlayerId, wasImposter, ... }` | Ovoz natijasi |
| `game_ended` | `{ winner, imposterNickname, commonWord, imposterWord }` | O'yin tugadi |

---

## O'yin jarayoni

```
1. Foydalanuvchi xona yaratadi yoki mavjud xonaga kiradi
2. WebSocket orqali xonaga qo'shiladi (join_room)
3. Host start_game yuboradi
4. Har bir o'yinchi game_started eventida o'z so'zini oladi
5. Navbat tartibida har biri 60 soniya ichida xabar yozadi
6. Kimdir start_voting yuborsa yoki vaqt tugasa ovoz berish boshlandi
7. Ovoz berish ixtiyoriy — ko'p ovoz olgan o'yinchi chiqariladi
8. Agar chiqarilgan = Imposter → oddiy o'yinchilar yutadi
9. Agar chiqarilgan ≠ Imposter → o'yin davom etadi / Imposter yutadi
```

---

## Development eslatmalar

- **OTP**: Development rejimida SMS yuborilmaydi — kod console'ga chiqariladi
- **Avatar**: Cloudinary sozlanmagan bo'lsa, dicebear.com'dan tasodifiy avatar
- **DB Sync**: `DB_SYNCHRONIZE=true` development'da schema avtomatik yaratiladi

---

*Muallif: Umaraliyev Usmon | v1.0.0*
