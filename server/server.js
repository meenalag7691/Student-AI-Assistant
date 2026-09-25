import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { StudySession } from './models/StudySession.js';
import { StudyGoal } from './models/StudyGoal.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// In-Memory Storage Fallback if MongoDB is not running locally
let isMongoConnected = false;
let memorySessions = [
  {
    _id: 'sample-1',
    problem: 'Exam in 3 days and I keep getting distracted by social media',
    category: 'Focus & Procrastination',
    advice: "### 🎯 5-Minute Kickstart Plan\n\n1. **The 5-Minute Rule**: Don't commit to studying for 3 hours. Open your notebook and read for just 5 minutes.\n2. **Friction Strategy**: Place your phone in another room.\n3. **Pomodoro Sprint (25+5)**: Focus on 1 chapter for 25 minutes, then take a 5-minute break.",
    isLiveAi: false,
    model: 'Smart Coach',
    isFavorite: true,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

let memoryGoals = [
  {
    _id: 'goal-1',
    title: 'Review Physics Chapter 4 (Electromagnetism)',
    subject: 'Physics',
    priority: 'high',
    completed: false,
    pomodorosTarget: 3,
    pomodorosDone: 1,
    createdAt: new Date().toISOString()
  },
  {
    _id: 'goal-2',
    title: 'Solve 15 Calculus Integration Problems',
    subject: 'Math',
    priority: 'medium',
    completed: true,
    pomodorosTarget: 2,
    pomodorosDone: 2,
    createdAt: new Date().toISOString()
  }
];

// MongoDB Connection attempt
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scholarflow';

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    isMongoConnected = true;
    console.log('✅ [MongoDB] Connected successfully to Database');
  })
  .catch((err) => {
    isMongoConnected = false;
    console.log('⚡ [MongoDB] Local Mongo not running - Activated In-Memory Fast Fallback (Ready for MongoDB Atlas)');
  });

// System Prompt for Student Assistant
const STUDENT_SYSTEM_PROMPT = `You are 'ScholarFlow AI', an elite, empathetic, and highly practical Academic Coach and Study Mentor for students.
Your mission is to help students overcome academic obstacles, boost learning efficiency, beat procrastination, and excel in exams with less stress.

Formatting Guidelines:
1. Always structure your responses with clean Markdown:
   - Use bold section titles (e.g., '### 🎯 Immediate Action Plan', '### 🧠 Study Strategy', '### ⏱️ Time-Boxing / Schedule', '### 💡 Pro-Tip').
   - Use bullet points and numbered lists for readability.
   - Highlight key concepts in **bold**.
2. Be empathetic, encouraging, and non-judgmental.
3. Recommend scientifically proven techniques: Active Recall, Spaced Repetition, Pomodoro, Feynman Technique, and Blurting.
4. Keep the advice actionable, specific, and realistic for a student to start within 5 minutes.`;

function generateSmartFallback(problem, category) {
  const p = problem.toLowerCase();
  if (p.includes('procrastinat') || p.includes('focus') || p.includes('distract') || p.includes('phone')) {
    return `### 🎯 5-Minute Kickstart Plan to Beat Distraction

It is completely normal to struggle with focus—your brain naturally seeks easy dopamine when faced with cognitively demanding tasks. Here is your immediate strategy:

1. **The 5-Minute Rule**: Don't commit to studying for 3 hours. Tell yourself: *'I will open my notebook and read for just 5 minutes.'* 80% of resistance disappears once you start.
2. **Friction Strategy**: Put your phone in another room or turn on Do Not Disturb. Every extra obstacle between you and distraction protects your deep focus.
3. **Pomodoro Sprint (25 + 5)**:
   - Set a timer for 25 minutes. Work on **one single task**.
   - Take a mandatory 5-minute break (stretch, drink water, no scrolling).
   - After 4 cycles, reward yourself with a 20-minute rest.

### 🧠 Mindset Shift
*Action creates motivation, not the other way around.* Take one small action right now!

> 💡 **Tip**: Connect your Google Gemini API key in settings for custom syllabus advice!`;
  } else if (p.includes('exam') || p.includes('test') || p.includes('revision') || p.includes('memor')) {
    return `### 📚 High-Impact Exam Prep Strategy

Cramming and passive rereading have less than a 20% retention rate. Upgrade your revision with these evidence-based techniques:

1. **The Blurting Method (Active Recall)**:
   - Read a chapter summary for 10 minutes.
   - Close the book. Write down everything you remember on a blank sheet.
   - Re-open notes and write in red pen what you missed. Those red notes are your exact weak spots.
2. **Past Paper Reverse Engineering**:
   - Prioritize high-weightage questions from the last 3-5 years.
   - Solve them under timed conditions before checking answer keys.
3. **Spaced Interval Checklist**:
   - Review today's topic tomorrow (Day 1), Day 3, and Day 7 to cement it in long-term memory.

### ⏱️ Suggested Daily Rhythm
- **Morning**: Difficult concepts & mathematical problem solving
- **Afternoon**: Active recall / Blurting & flashcards
- **Evening**: Quick summary recap & review tomorrow's goals`;
  } else {
    return `### 🎯 Strategic Study Blueprint for: '${problem}'

Here is a structured framework to tackle this academic challenge:

1. **Deconstruct the Problem**:
   - Break the topic into 3 smaller micro-tasks. Tackling small chunks eliminates cognitive overload.
2. **The Feynman Technique**:
   - Explain the concept aloud as if teaching it to a 10-year-old. Wherever you get stuck is where your understanding has gaps.
3. **Next Immediate 15 Minutes**:
   - Open your primary textbook or lecture slides.
   - Write down 3 essential questions you want to be able to answer by the end of today.

### 🚀 Next Steps
- Start with the most difficult concept while your mental energy is fresh.
- Test yourself frequently rather than just re-reading.`;
  }
}

// --------------------------------------------------------------------------
// API Routes
// --------------------------------------------------------------------------

// Health & Status
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  res.json({
    status: 'online',
    isMongoConnected,
    hasApiKey: hasKey,
    model: 'gemini-2.5-flash',
    dbMode: isMongoConnected ? 'MongoDB (Active)' : 'In-Memory / Atlas Ready'
  });
});

// Help / Strategy generation
app.post('/api/help', async (req, res) => {
  const { problem, category = 'General', apiKey } = req.body;
  if (!problem || !problem.trim()) {
    return res.status(400).json({ error: 'Please describe your study problem.' });
  }

  const effectiveKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let adviceText = '';
  let isLiveAi = false;

  if (effectiveKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: effectiveKey });
      const prompt = `Student Category: ${category}\nStudent Problem: ${problem}\nProvide personalized, structured, empathetic study coaching with action steps.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: STUDENT_SYSTEM_PROMPT,
          temperature: 0.7
        }
      });

      adviceText = response.text || generateSmartFallback(problem, category);
      isLiveAi = true;
    } catch (err) {
      console.error('[Gemini API Error]:', err.message);
      adviceText = generateSmartFallback(problem, category);
      isLiveAi = false;
    }
  } else {
    adviceText = generateSmartFallback(problem, category);
    isLiveAi = false;
  }

  // Save session to MongoDB or In-Memory
  const newSessionData = {
    problem: problem.trim(),
    category,
    advice: adviceText,
    isLiveAi,
    model: isLiveAi ? 'gemini-2.5-flash' : 'Smart Coach',
    isFavorite: false,
    createdAt: new Date()
  };

  let savedRecord = null;
  if (isMongoConnected) {
    try {
      savedRecord = await StudySession.create(newSessionData);
    } catch (e) {
      console.error('[Mongo Save Error]:', e.message);
    }
  }

  if (!savedRecord) {
    savedRecord = { ...newSessionData, _id: 'mem-' + Date.now() };
    memorySessions.unshift(savedRecord);
  }

  res.json({
    status: 'success',
    advice: adviceText,
    category,
    isLiveAi,
    session: savedRecord
  });
});

// Get Session History
app.get('/api/sessions', async (req, res) => {
  if (isMongoConnected) {
    try {
      const list = await StudySession.find().sort({ createdAt: -1 }).limit(25);
      return res.json(list);
    } catch (e) {
      console.error(e);
    }
  }
  res.json(memorySessions);
});

// Toggle Favorite Session
app.put('/api/sessions/:id/favorite', async (req, res) => {
  const { id } = req.params;
  if (isMongoConnected) {
    try {
      const doc = await StudySession.findById(id);
      if (doc) {
        doc.isFavorite = !doc.isFavorite;
        await doc.save();
        return res.json(doc);
      }
    } catch (e) {}
  }

  const mem = memorySessions.find(s => s._id === id);
  if (mem) {
    mem.isFavorite = !mem.isFavorite;
    return res.json(mem);
  }
  res.status(404).json({ error: 'Session not found' });
});

// Delete Session
app.delete('/api/sessions/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoConnected) {
    try {
      await StudySession.findByIdAndDelete(id);
      return res.json({ success: true });
    } catch (e) {}
  }
  memorySessions = memorySessions.filter(s => s._id !== id);
  res.json({ success: true });
});

// Study Goals CRUD
app.get('/api/goals', async (req, res) => {
  if (isMongoConnected) {
    try {
      const goals = await StudyGoal.find().sort({ createdAt: -1 });
      return res.json(goals);
    } catch (e) {}
  }
  res.json(memoryGoals);
});

app.post('/api/goals', async (req, res) => {
  const { title, subject, priority, pomodorosTarget } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const goalData = {
    title,
    subject: subject || 'General',
    priority: priority || 'medium',
    completed: false,
    pomodorosTarget: Number(pomodorosTarget) || 2,
    pomodorosDone: 0,
    createdAt: new Date()
  };

  if (isMongoConnected) {
    try {
      const created = await StudyGoal.create(goalData);
      return res.json(created);
    } catch (e) {}
  }

  const created = { ...goalData, _id: 'goal-' + Date.now() };
  memoryGoals.unshift(created);
  res.json(created);
});

app.put('/api/goals/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (isMongoConnected) {
    try {
      const updated = await StudyGoal.findByIdAndUpdate(id, updates, { new: true });
      return res.json(updated);
    } catch (e) {}
  }

  const idx = memoryGoals.findIndex(g => g._id === id);
  if (idx !== -1) {
    memoryGoals[idx] = { ...memoryGoals[idx], ...updates };
    return res.json(memoryGoals[idx]);
  }
  res.status(404).json({ error: 'Goal not found' });
});

app.delete('/api/goals/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoConnected) {
    try {
      await StudyGoal.findByIdAndDelete(id);
      return res.json({ success: true });
    } catch (e) {}
  }
  memoryGoals = memoryGoals.filter(g => g._id !== id);
  res.json({ success: true });
});

// AI Flashcards Generator Endpoint
app.post('/api/flashcards/generate', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  const effectiveKey = req.body.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (effectiveKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: effectiveKey });
      const prompt = `Generate exactly 5 high-yield study flashcards for the topic: "${topic}". Return ONLY a valid JSON array of objects with keys: "question" and "answer". Do not wrap in markdown quotes if possible.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({ flashcards: parsed });
    } catch (e) {
      console.error('[Flashcard AI Error]:', e.message);
    }
  }

  // Fallback high-yield flashcards
  res.json({
    flashcards: [
      { question: `What is the core principle of ${topic}?`, answer: `The fundamental rule or definition that forms the foundation of understanding ${topic}.` },
      { question: `How do you apply ${topic} in exam problem solving?`, answer: `Identify key variables, state the relevant formula or mechanism, and show step-by-step reasoning.` },
      { question: `What is the most common mistake students make with ${topic}?`, answer: `Confusing similar terms or skipping prerequisite concept checks.` },
      { question: `Give a real-world analogy for ${topic}.`, answer: `Thinking of it like a system where inputs convert to expected outputs with minimal friction.` },
      { question: `How would you test your mastery of ${topic}?`, answer: `Use the Feynman technique: Explain it to a friend or write it down without referencing your notes.` }
    ]
  });
});

// Save API Key to .env
app.post('/api/save-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key is required' });

  const envPath = path.join(process.cwd(), '.env');
  try {
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n').filter(l => !l.startsWith('GEMINI_API_KEY='));
      lines.push(`GEMINI_API_KEY=${apiKey}`);
      content = lines.join('\n');
    } else {
      content = `GEMINI_API_KEY=${apiKey}\nPORT=5001\n`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
    process.env.GEMINI_API_KEY = apiKey;
    res.json({ success: true, message: 'Gemini API key saved in .env' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write .env file' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [ScholarFlow Express] Server running on http://localhost:${PORT}`);
});
