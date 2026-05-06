# HandLingo

A gamified web platform that teaches International Sign (ISL) using a webcam and a GRU neural network to validate real-time hand gestures.

## Stack
- **Frontend:** React JS (`/frontend`)
- **Backend:** FastAPI + Supabase (`/backend`)
- **Computer Vision:** MediaPipe + GRU Network

## Getting Started

### Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload

### Frontend
cd frontend
npm install
npm run dev
