# Virtual Laboratory — AI Gamified Science

A full-stack web application where students can perform simulated science experiments step by step with AI guidance and gamification.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **Authentication:** JWT
- **AI:** Google Gemini API

## Features

- User registration & login with JWT authentication
- Dashboard with points, badges, and experiment progress
- Step-by-step interactive experiment simulation with visual animations
- AI Tutor powered by Gemini API for real-time guidance
- Gamification: 10 pts per correct step, 50 bonus pts on completion
- Badges: First Experiment, Lab Beginner, Chemistry Explorer

## Experiments

1. **Acid-Base Neutralization** (Chemistry)
2. **Simple Circuit Experiment** (Physics)
3. **Water Distillation** (Chemistry)

---

## Setup & Run

### Prerequisites

- Node.js (v18+)
- MongoDB (running locally on port 27017)
- Gemini API key (optional — fallback guidance works without it)

### 1. Backend Setup

```bash
cd backend
npm install
```

Configure `.env`:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/virtual_lab
JWT_SECRET=your_super_secret_jwt_key_change_in_production
GEMINI_API_KEY=your_gemini_api_key_here
```

Start backend:

```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Open

Visit: **http://localhost:5173**

---

## API Endpoints

| Method | Route               | Description                            |
| ------ | ------------------- | -------------------------------------- |
| POST   | `/auth/register`    | Register new user                      |
| POST   | `/auth/login`       | Login user                             |
| GET    | `/auth/profile`     | Get user profile (auth required)       |
| GET    | `/experiments`      | List all experiments (auth required)   |
| GET    | `/experiments/:id`  | Get experiment details (auth required) |
| POST   | `/experiments/step` | Submit experiment step (auth required) |
| POST   | `/ai/help`          | Get AI tutor guidance (auth required)  |

---

## Gamification

| Action                      | Points  |
| --------------------------- | ------- |
| Correct step                | +10 pts |
| Experiment completion bonus | +50 pts |

| Badge                 | Requirement                         |
| --------------------- | ----------------------------------- |
| First Experiment 🥇   | Complete 1 experiment               |
| Lab Beginner 🧪       | Complete 2 experiments              |
| Chemistry Explorer ⚗️ | Complete both chemistry experiments |

---

## Setting Up Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Add it to `backend/.env` as `GEMINI_API_KEY=your_key_here`

> Without a Gemini API key, the app uses built-in fallback guidance — all features still work.
