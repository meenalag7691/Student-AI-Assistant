# 🎓 ScholarFlow AI • Modern MERN Stack Academic Assistant

ScholarFlow is an intelligent, full-stack **MERN** (MongoDB, Express, React 19, Node.js) academic assistant and productivity suite powered by **Google Gemini 2.5 Flash**.

---

## 🚀 Key Highlights & Architecture

### 1. **Frontend (React 19 + Vite)**
- **Modern Sidebar Dashboard**:
  - 🎓 **AI Study Coach**: Formatted Markdown advice, active recall prompts, Text-to-Speech (Listen Aloud), one-click clipboard copying.
  - ⏱️ **Pomodoro Focus Timer**: 25m Focus / 5m Break / 15m Long Break sprints with real-time countdown, completion alert, and celebratory confetti effects.
  - 🗂️ **AI Flashcard Deck**: Interactive 3D flip card system generating 5 high-yield revision cards for any subject or topic.
  - 🎯 **Daily Study Goals**: Interactive task checklist with subject tags and progress tracking.
  - 📜 **Saved Advice History**: Search and filter previous problem sessions.
- **Visual Design**: Vanilla CSS glassmorphism, floating ambient glow orbs, modern typography (`Outfit`, `Plus Jakarta Sans`, `JetBrains Mono`), and Dark/Light mode toggle.

### 2. **Backend (Node.js + Express + Mongoose)**
- Running on port `5001`.
- **Database Engine**: Supports local MongoDB and MongoDB Atlas via `MONGODB_URI` with an automatic, resilient in-memory fallback.
- **Google GenAI Integration**: Direct integration with `@google/genai` using model `gemini-2.5-flash`.
- **RESTful Endpoints**:
  - `GET /api/health` - Health check and DB/AI status.
  - `POST /api/help` - Generates personalized study strategies.
  - `GET /api/sessions` - Retrieves past study sessions.
  - `GET & POST & PUT /api/goals` - Manages daily study objectives.
  - `POST /api/flashcards/generate` - Generates active-recall flashcard decks.
  - `POST /api/save-key` - Saves Gemini API Key into `.env`.

---

## 🛠️ How to Run

1. **Start both Backend and Frontend together**:
   ```bash
   npm run dev
   ```
2. **Access the Web App**:
   👉 **[http://localhost:3000](http://localhost:3000)**

*(The Express backend runs on `http://localhost:5001` and is automatically proxied by Vite).*

---

## 🔑 Connect Google Gemini 2.5 Flash API Key

1. Grab a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **API Key** in the sidebar footer and paste it.
3. Once saved, the status badge turns green: `● Gemini 2.5 Flash`.
