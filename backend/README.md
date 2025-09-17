# Le radici di sè — Backend (Node/Express + MongoDB)

API REST + realtime per gestione autenticazione, appuntamenti, slot, diario, questionari, notifiche e risorse del terapeuta.

## Stack

- Node.js 18+ / npm
- Express 5, Helmet, CORS, cookie-parser
- MongoDB + Mongoose 8
- JWT (access token in header, refresh httpOnly cookie)
- Socket.IO 4 (notifiche in tempo reale)
- Nodemon in dev

## Requisiti

- MongoDB in esecuzione
- Node 18+ / npm

## Setup rapido

```bash
cd backend
cp .env.example .env
npm install
npm run dev



MONGODB_URI=mongodb+srv://user1:Test1234@cluster1.kgtzi2d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1
JWT_SECRET=una-chiave-segreta
PORT=5000
ACCESS_TOKEN_SECRET=supersegreto123
REFRESH_TOKEN_SECRET=altrosegreto456
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
THERAPIST_EMAIL=terapeuta@example.com
THERAPIST_PASSWORD=Thera123!
THERAPIST_NAME=Felice
THERAPIST_SURNAME=Felicissimo
THERAPIST_BIRTHDATE=1980-01-01
RESET_ENUMERATE=false
RESET_ALLOW_THERAPIST=false
RESET_TOKEN_TTL_MINUTES=15
TZ=Europe/Rome


```
