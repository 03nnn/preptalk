# PrepTalk: AI-Powered Mock Interview Practice

PrepTalk is a full-stack web application designed to help job seekers practice for interviews with **AI-generated questions**, **expert feedback**, and **human-like voice narration**.

Powered by **Groq's LLaMA 3.3-70B** for intelligent question generation and interview analysis.

## Features

### 🎤 **Voice-First Interview Practice**
- Record natural-sounding spoken answers to interview questions
- Real-time audio transcription with faster-whisper (Whisper DistilModel)
- AI-powered feedback on fluency, grammar, confidence, and relevance
- Natural-sounding TTS with voice preference (macOS Samantha, Google voices, etc.)

### 🤖 **AI-Generated Questions** 
- Unique, scenario-based questions (not from static pools)
- Domain-specific for job roles (Data Scientist, Software Engineer, etc.)
- Difficulty-aware (Easy → Fresher, Medium → Mid-level, Hard → Senior scenarios)
- Powered by OpenAI-compatible LLM (Groq)

### 📊 **Intelligent Feedback & Analysis**
- **5 Scoring Metrics**: Fluency, Grammar, Confidence, Relevance, Overall (each 0-10)
- **AI Summary**: 2-3 sentence personalized feedback addressing you directly
- **Detailed Analysis**: Strengths, areas for improvement, filler word detection
- **Sentiment & Tone**: Emotional analysis of your response
- **Actionable Tips**: Specific suggestions for improvement

### 📈 **Progress Tracking**
- Historical session analytics with line charts
- Category-wise performance breakdown with bar charts
- Quick stats on total interviews, average scores, and trends
- PDF report generation for offline review

### 💬 **AI Interview Coach Chatbot**
- Expert coaching using STAR method (Situation, Task, Action, Result)
- Answer common interview questions
- Get tips tailored to your role and experience level
- Constructive feedback on your answers

### 📱 **Multiple Question Categories**
- **HR Questions**: Behavioral, company fit, culture alignment
- **Technical Questions**: Problem-solving, system design, domain expertise
- **Behavioral Questions**: Teamwork, conflict resolution, adaptability

## Tech Stack

### Frontend
- **Next.js 15** (React 19) with App Router
- **TypeScript** for type safety
- **Tailwind CSS 3.4** for styling
- **shadcn/ui** for professional component library
- **Recharts** for data visualization
- **pdf-lib** for PDF report generation
- **lucide-react** for icons

### Backend
- **Python 3.x** with FastAPI
- **faster-whisper** (Whisper DistilModel) for speech-to-text
- **OpenAI-compatible API** integration (Groq LLaMA 3.3-70B)
- **MongoDB Atlas** for data persistence
- **CORS** middleware for secure cross-origin requests

## Project Structure

```
preptalk/
├── app/                           # Next.js App Router
│   ├── api/                       # API route handlers (proxy to backend)
│   │   ├── analyze_interview/     # Audio analysis + AI feedback
│   │   ├── chat/                  # Chatbot assistant
│   │   ├── feedback/              # Conversation analysis + PDF generation
│   │   ├── login/ & register/     # Auth proxy
│   │   ├── progress/              # User progress/analytics
│   │   └── question/              # AI question generation
│   ├── assistant/                 # Chatbot page
│   ├── dashboard/                 # Progress dashboard with charts
│   ├── practice/                  # Main practice interview page
│   ├── reports/latest/            # Latest feedback report
│   ├── globals.css                # Global styles + animations
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing page
├── backend/                       # Python FastAPI server
│   ├── main.py                    # All endpoints + LLM integration
│   ├── .env                       # API keys (Groq, MongoDB Atlas)
│   ├── requirements.txt           # Python dependencies
│   └── venv/                      # Virtual environment
├── components/                    # Reusable React components
│   ├── AppSidebar.tsx             # Navigation
│   ├── LayoutWithSidebar.tsx      # Main layout wrapper
│   └── ui/                        # shadcn/ui components
├── public/                        # Static assets
├── lib/                           # Utility functions
├── hooks/                         # Custom React hooks
├── tailwind.config.ts             # Tailwind configuration
├── next.config.mjs                # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/pnpm
- Python 3.8+
- Git

### Frontend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/preptalk.git
   cd preptalk
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Create `.env.local` in the root directory:
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create `.env` file in the backend directory:
   ```env
   # Groq LLM API (for AI questions, feedback, chat)
   LLM_API_KEY=your_groq_api_key_here
   LLM_API_BASE=https://api.groq.com/openai/v1
   LLM_MODEL=llama-3.3-70b-versatile
   
   # MongoDB Atlas (for user data persistence)
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/soullink?retryWrites=true&w=majority
   ```

   **Get your Groq API key**: [groq.com/login](https://console.groq.com/login)
   
   **MongoDB Atlas**: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

5. Run the FastAPI server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

6. The API will be available at [http://localhost:8000](http://localhost:8000)

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/question` | GET | Generate AI question (with parameters: category, jobDomain, difficulty) |
| `/analyze_interview` | POST | Transcribe audio + generate AI feedback (multipart form) |
| `/feedback` | POST | Analyze conversation text + optional PDF generation |
| `/chat` | POST | Get AI coaching on interview questions |
| `/progress` | GET | Get user interview history + analytics |
| `/login` | POST | User authentication |
| `/register` | POST | User registration |

## Recent Improvements (v2.0)

### ✨ LLM & Prompting
- **Upgraded system prompts** with expert personas for instruction-following
- **AI question generation** now truly unique (not fallback pool) + domain/difficulty-aware
- **Fixed JSON parsing** — strips markdown fences LLMs add around JSON output
- **New scoring metric** — "Relevance" (0-10) to measure answer relevance to question
- **AI Summary** — 2-3 sentence overall assessment addressing you directly

### 🎙️ Voice & Audio
- **Better TTS voice selection** — Prioritizes premium macOS voices (Samantha, Ava, Zoe) and Google voices
- **Natural cadence tuning** — rate 0.92, pitch 1.02 for warmer, slower-paced speech
- **Multi-accent support** — Falls back through en-US, en-GB, etc.

### 📊 Reports & Feedback
- **PDF generation** now includes all 5 scores + AI summary
- **Reports page** displays relevance score and AI summary
- **Practice card** shows all 5 metrics with gradient progress bars

### 🧹 Code Quality
- **Removed dead code** — Unused `build_prompt()`, redundant imports
- **Type safety** — Updated Feedback type to include new fields
- **Error handling** — Graceful fallbacks when LLM/Whisper/MongoDB unavailable
- **Logging** — Better debug information for troubleshooting

## Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Backend (`.backend/.env`)
```env
# Required: Groq API
LLM_API_KEY=gsk_...
LLM_API_BASE=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile

# Optional: MongoDB (for persistence; works without it in demo mode)
MONGO_URI=mongodb+srv://...
```