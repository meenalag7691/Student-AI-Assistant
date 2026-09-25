import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Clock,
  Layers,
  CheckCircle2,
  History,
  Key,
  Sun,
  Moon,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Star,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Send,
  ExternalLink,
  ChevronRight,
  Flame,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';

const TOPIC_CATEGORIES = [
  { id: 'Focus & Procrastination', label: '🎯 Focus & Procrastination', placeholder: 'e.g., I keep scrolling on my phone and have 2 chapters of chemistry left for tomorrow...' },
  { id: 'Exam Revision', label: '📚 Exam Revision & Memory', placeholder: 'e.g., Exam in 4 days. How should I use active recall and blurting to cover the syllabus?' },
  { id: 'Concept Breakdown', label: '🧩 Concept Breakdown', placeholder: 'e.g., Explain the Feynman Technique or how dynamic programming works in simple steps...' },
  { id: 'Study Schedule', label: '📅 Daily Study Schedule', placeholder: 'e.g., I have 4 hours after school. Create a balanced, high-retention study timetable...' },
  { id: 'Stress & Anxiety', label: '🧘 Stress & Overwhelm', placeholder: 'e.g., I feel overwhelmed by deadlines and my mind goes blank during exams...' },
  { id: 'Doubt & Homework', label: '💡 Homework & Doubt Help', placeholder: 'e.g., How do I structure a persuasive essay conclusion effectively?' }
];

export default function App() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState('coach');
  const [theme, setTheme] = useState(localStorage.getItem('scholar_theme') || 'dark');

  // Backend & AI Status
  const [backendStatus, setBackendStatus] = useState({
    status: 'connecting',
    isMongoConnected: false,
    hasApiKey: false,
    model: 'gemini-2.5-flash',
    dbMode: 'Checking...'
  });

  // AI Study Coach State
  const [selectedCategory, setSelectedCategory] = useState(TOPIC_CATEGORIES[0].id);
  const [problemText, setProblemText] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [currentAdvice, setCurrentAdvice] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Pomodoro State
  const [pomoMode, setPomoMode] = useState('focus'); // focus (25m), shortBreak (5m), longBreak (15m)
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [pomoCount, setPomoCount] = useState(0);

  // Flashcards State
  const [flashcardTopic, setFlashcardTopic] = useState('');
  const [flashcards, setFlashcards] = useState([
    { question: 'What is the Feynman Technique?', answer: 'A learning method where you explain a concept in simple language as if teaching a beginner to expose gaps.' },
    { question: 'What is the Spaced Repetition interval rule?', answer: 'Reviewing information at increasing intervals (Day 1, 3, 7, 14, 30) to shift it into long-term memory.' },
    { question: 'What is the 5-Minute Rule for procrastination?', answer: 'Committing to work on a task for just 5 minutes without pressure to continue; 80% of resistance vanishes after starting.' }
  ]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);

  // Goals State
  const [goals, setGoals] = useState([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalSubject, setNewGoalSubject] = useState('General');

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);

  // Modal & Toast
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('scholar_gemini_key') || '');
  const [toast, setToast] = useState({ show: false, text: '' });

  // References
  const timerIntervalRef = useRef(null);
  const utteranceRef = useRef(null);

  // Initialize Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('scholar_theme', theme);
  }, [theme]);

  // Fetch Health & Initial Data
  useEffect(() => {
    fetchBackendStatus();
    fetchGoals();
    fetchHistory();
  }, []);

  const showToast = (text) => {
    setToast({ show: true, text });
    setTimeout(() => setToast({ show: false, text: '' }), 3000);
  };

  const fetchBackendStatus = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data);
      }
    } catch (e) {
      console.warn('Backend not responding yet');
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch (e) { }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (e) { }
  };

  // --------------------------------------------------------------------------
  // AI Coach Submit
  // --------------------------------------------------------------------------
  const handleGetAdvice = async () => {
    if (!problemText.trim()) {
      showToast('Please describe your study problem first!');
      return;
    }

    setCoachLoading(true);
    const storedKey = localStorage.getItem('scholar_gemini_key') || '';

    try {
      const res = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: problemText,
          category: selectedCategory,
          apiKey: storedKey
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentAdvice(data);
        fetchHistory();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      } else {
        showToast(data.error || 'Failed to get advice');
      }
    } catch (err) {
      showToast('Unable to reach assistant. Please try again.');
    } finally {
      setCoachLoading(false);
    }
  };

  // Text-To-Speech
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis not supported in this browser');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!currentAdvice?.advice) return;

    // Strip markdown formatting for cleaner speech
    const cleanText = currentAdvice.advice.replace(/[#*`>-]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;

    window.speechSynthesis.speak(utterance);
  };

  // Copy advice
  const copyAdvice = async () => {
    if (!currentAdvice?.advice) return;
    try {
      await navigator.clipboard.writeText(currentAdvice.advice);
      showToast('Study Plan copied to clipboard! 📋');
    } catch (e) {
      showToast('Failed to copy');
    }
  };

  // Markdown renderer
  const renderMarkdown = (text) => {
    if (window.marked && typeof window.marked.parse === 'function') {
      return { __html: window.marked.parse(text) };
    }
    return { __html: `<p>${text.replace(/\n/g, '<br/>')}</p>` };
  };

  // --------------------------------------------------------------------------
  // Pomodoro Logic
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning, pomoMode]);

  const handleTimerComplete = () => {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    if (pomoMode === 'focus') {
      setPomoCount((c) => c + 1);
      showToast('🎉 Focus session complete! Time for a well-deserved break.');
      setPomoMode('shortBreak');
      setTimeLeft(5 * 60);
    } else {
      showToast('⚡ Break finished! Ready for the next focus sprint?');
      setPomoMode('focus');
      setTimeLeft(25 * 60);
    }
  };

  const changePomoMode = (mode) => {
    setPomoMode(mode);
    setIsTimerRunning(false);
    if (mode === 'focus') setTimeLeft(25 * 60);
    if (mode === 'shortBreak') setTimeLeft(5 * 60);
    if (mode === 'longBreak') setTimeLeft(15 * 60);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --------------------------------------------------------------------------
  // Flashcards Generation
  // --------------------------------------------------------------------------
  const generateFlashcards = async () => {
    if (!flashcardTopic.trim()) {
      showToast('Enter a topic to generate flashcards!');
      return;
    }

    setCardsLoading(true);
    const storedKey = localStorage.getItem('scholar_gemini_key') || '';

    try {
      const res = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: flashcardTopic, apiKey: storedKey })
      });

      const data = await res.json();
      if (res.ok && data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setCardIndex(0);
        setIsFlipped(false);
        showToast(`✨ Generated ${data.flashcards.length} active-recall cards!`);
      }
    } catch (e) {
      showToast('Failed to generate flashcards');
    } finally {
      setCardsLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Goals Management
  // --------------------------------------------------------------------------
  const addGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newGoalTitle, subject: newGoalSubject })
      });

      if (res.ok) {
        const created = await res.json();
        setGoals([created, ...goals]);
        setNewGoalTitle('');
        showToast('Study goal added! 🎯');
      }
    } catch (e) {
      showToast('Error saving goal');
    }
  };

  const toggleGoal = async (id, currentCompleted) => {
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted })
      });

      if (res.ok) {
        const updated = await res.json();
        setGoals(goals.map((g) => (g._id === id ? updated : g)));
        if (!currentCompleted) {
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
        }
      }
    } catch (e) { }
  };

  const deleteGoal = async (id) => {
    try {
      await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      setGoals(goals.filter((g) => g._id !== id));
      showToast('Goal removed');
    } catch (e) { }
  };

  // --------------------------------------------------------------------------
  // API Key Save
  // --------------------------------------------------------------------------
  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      showToast('Enter an API key');
      return;
    }

    localStorage.setItem('scholar_gemini_key', apiKeyInput.trim());

    try {
      const res = await fetch('/api/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() })
      });

      if (res.ok) {
        showToast('AI Key saved successfully! ✨');
        fetchBackendStatus();
        setIsKeyModalOpen(false);
      }
    } catch (e) {
      showToast('Key saved in browser storage');
      setIsKeyModalOpen(false);
    }
  };

  const completedGoalsCount = goals.filter((g) => g.completed).length;

  return (
    <div className="app-container">
      {/* Ambient background glows */}
      <div className="ambient-orb orb-left" />
      <div className="ambient-orb orb-right" />

      {/* Modern Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="brand-section">
            <div className="brand-logo">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="brand-title">
                ScholarFlow <span className="stack-tag">AI</span>
              </div>
              <div className="brand-desc">Personal Study Assistant</div>
            </div>
          </div>

          <ul className="nav-menu">
            <li
              className={`nav-item ${activeTab === 'coach' ? 'active' : ''}`}
              onClick={() => setActiveTab('coach')}
            >
              <div className="nav-icon"><Sparkles size={18} /></div>
              <span>AI Study Coach</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'pomodoro' ? 'active' : ''}`}
              onClick={() => setActiveTab('pomodoro')}
            >
              <div className="nav-icon"><Clock size={18} /></div>
              <span>Focus Timer</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'flashcards' ? 'active' : ''}`}
              onClick={() => setActiveTab('flashcards')}
            >
              <div className="nav-icon"><Layers size={18} /></div>
              <span>AI Flashcards</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`}
              onClick={() => setActiveTab('goals')}
            >
              <div className="nav-icon"><CheckCircle2 size={18} /></div>
              <span>Study Goals</span>
            </li>
            <li
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <div className="nav-icon"><History size={18} /></div>
              <span>Saved Advice</span>
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <div className="status-indicators">
            <div className="status-pill" title="System Ready">
              <span className="status-dot-pulse dot-green" />
              <span>{backendStatus.hasApiKey ? 'AI Active' : 'Study Coach Ready'}</span>
            </div>
          </div>

          <div className="sidebar-controls">
            <button
              className="btn-ctrl"
              onClick={() => setIsKeyModalOpen(true)}
              title="Configure AI Assistant"
            >
              <Key size={15} />
              <span>AI Key</span>
            </button>
            <button
              className="btn-ctrl"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-content">
        {/* Top Header Card */}
        <header className="top-hero">
          <div className="hero-titles">
            <h1>
              {activeTab === 'coach' && 'AI Academic Coach & Strategy'}
              {activeTab === 'pomodoro' && 'Pomodoro Deep Focus Sprints'}
              {activeTab === 'flashcards' && 'Active Recall Flashcard Decks'}
              {activeTab === 'goals' && 'Daily Academic Goals & Checklist'}
              {activeTab === 'history' && 'Past Study Advice & Revision Plans'}
            </h1>
            <p>
              {activeTab === 'coach' && 'Evidence-based learning techniques tailored for students.'}
              {activeTab === 'pomodoro' && 'Eliminate distractions with timed 25-minute study intervals.'}
              {activeTab === 'flashcards' && 'Generate 5 high-yield exam question cards for any subject.'}
              {activeTab === 'goals' && 'Break your syllabus down into manageable daily milestones.'}
              {activeTab === 'history' && 'Revisit your previous study plans and revision strategies.'}
            </p>
          </div>

          <div className="quick-stats">
            <div className="stat-box">
              <div className="stat-value">{pomoCount}</div>
              <div className="stat-label">Pomodoros</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{completedGoalsCount}/{goals.length}</div>
              <div className="stat-label">Goals Done</div>
            </div>
          </div>
        </header>

        {/* TAB 1: AI COACH */}
        {activeTab === 'coach' && (
          <>
            {/* Category selector */}
            <div className="category-row">
              {TOPIC_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Input Card */}
            <div className="coach-card">
              <textarea
                className="coach-textarea"
                rows="4"
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                placeholder={
                  TOPIC_CATEGORIES.find((c) => c.id === selectedCategory)?.placeholder ||
                  'Describe your study roadblock...'
                }
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleGetAdvice();
                  }
                }}
              />

              <div className="input-toolbar">
                <div className="prompts-slider">
                  <button
                    className="prompt-btn"
                    onClick={() => setProblemText("I have an exam in 3 days and haven't started. Give me a realistic plan.")}
                  >
                    "Exam in 3 days, haven't started..."
                  </button>
                  <button
                    className="prompt-btn"
                    onClick={() => setProblemText("How do I stay focused without checking my phone every 10 mins?")}
                  >
                    "Stop checking my phone..."
                  </button>
                </div>

                <button
                  className="submit-btn"
                  disabled={coachLoading}
                  onClick={handleGetAdvice}
                >
                  <Sparkles size={16} />
                  <span>{coachLoading ? 'Generating Plan...' : 'Get AI Strategy'}</span>
                </button>
              </div>
            </div>

            {/* Response Card */}
            {currentAdvice && (
              <div className="response-card">
                <div className="response-top">
                  <div className="coach-badge">
                    <div className="coach-avatar">🎓</div>
                    <div className="coach-info">
                      <h3>ScholarFlow Study Plan</h3>
                      <div className="coach-sub">
                        <span>{currentAdvice.category}</span>
                        <span className="pill-live">
                          {currentAdvice.isLiveAi ? 'AI Powered' : 'Active Recall Plan'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="response-actions">
                    <button className="action-btn" onClick={copyAdvice} title="Copy Plan">
                      <Copy size={15} />
                      <span>Copy</span>
                    </button>
                    <button
                      className={`action-btn ${isSpeaking ? 'active' : ''}`}
                      onClick={toggleSpeech}
                      title="Text-to-Speech"
                    >
                      {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                    </button>
                  </div>
                </div>

                <div
                  className="markdown-content"
                  dangerouslySetInnerHTML={renderMarkdown(currentAdvice.advice)}
                />
              </div>
            )}
          </>
        )}

        {/* TAB 2: POMODORO TIMER */}
        {activeTab === 'pomodoro' && (
          <div className="pomodoro-container">
            <div className="timer-modes">
              <button
                className={`timer-mode-btn ${pomoMode === 'focus' ? 'active' : ''}`}
                onClick={() => changePomoMode('focus')}
              >
                Focus (25m)
              </button>
              <button
                className={`timer-mode-btn ${pomoMode === 'shortBreak' ? 'active' : ''}`}
                onClick={() => changePomoMode('shortBreak')}
              >
                Short Break (5m)
              </button>
              <button
                className={`timer-mode-btn ${pomoMode === 'longBreak' ? 'active' : ''}`}
                onClick={() => changePomoMode('longBreak')}
              >
                Long Break (15m)
              </button>
            </div>

            <div className="timer-dial-outer">
              <div className="timer-clock">{formatTime(timeLeft)}</div>
              <div className="timer-status-hint">
                {isTimerRunning
                  ? (pomoMode === 'focus' ? '⚡ In Deep Focus' : '☕ Refreshing Break')
                  : (pomoMode === 'focus' ? 'Royal Chronometer' : pomoMode === 'shortBreak' ? '5-Min Rest Interval' : '15-Min Long Rest')}
              </div>
            </div>

            <div className="timer-controls">
              <button
                className="timer-btn-primary"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
              >
                {isTimerRunning ? <Pause size={20} /> : <Play size={20} />}
                <span style={{ marginLeft: 8 }}>
                  {isTimerRunning
                    ? (pomoMode === 'focus' ? 'Pause Focus' : 'Pause Break')
                    : (pomoMode === 'focus' ? 'Start Focus' : pomoMode === 'shortBreak' ? 'Start Break' : 'Start Long Break')}
                </span>
              </button>
              <button
                className="timer-btn-secondary"
                onClick={() => changePomoMode(pomoMode)}
                title="Reset Timer"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: AI FLASHCARDS */}
        {activeTab === 'flashcards' && (
          <div className="flashcards-container">
            <div className="flashcard-generator">
              <input
                className="flashcard-input"
                placeholder="Enter subject/topic (e.g. Mitochondria, Thermodynamics, French Verbs)..."
                value={flashcardTopic}
                onChange={(e) => setFlashcardTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateFlashcards()}
              />
              <button
                className="submit-btn"
                disabled={cardsLoading}
                onClick={generateFlashcards}
              >
                <Sparkles size={16} />
                <span>{cardsLoading ? 'Generating...' : 'Generate Deck'}</span>
              </button>
            </div>

            {flashcards.length > 0 && (
              <>
                <div
                  className="flashcard-card-perspective"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
                    <div className="flashcard-face flashcard-front">
                      <span className="flashcard-hint">Question (Click to flip)</span>
                      <p className="flashcard-text">{flashcards[cardIndex].question}</p>
                    </div>
                    <div className="flashcard-face flashcard-back">
                      <span className="flashcard-hint">Answer (Click to flip)</span>
                      <p className="flashcard-text">{flashcards[cardIndex].answer}</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    className="action-btn"
                    disabled={cardIndex === 0}
                    onClick={() => {
                      setCardIndex((c) => Math.max(0, c - 1));
                      setIsFlipped(false);
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                    Card {cardIndex + 1} of {flashcards.length}
                  </span>
                  <button
                    className="action-btn"
                    disabled={cardIndex === flashcards.length - 1}
                    onClick={() => {
                      setCardIndex((c) => Math.min(flashcards.length - 1, c + 1));
                      setIsFlipped(false);
                    }}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: STUDY GOALS */}
        {activeTab === 'goals' && (
          <div className="goals-container">
            <form className="goal-creator" onSubmit={addGoal}>
              <input
                className="goal-input"
                placeholder="Add study objective for today (e.g., Solve 10 integration problems)..."
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
              />
              <select
                className="action-btn"
                value={newGoalSubject}
                onChange={(e) => setNewGoalSubject(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Math">Math</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="Literature">Literature</option>
              </select>
              <button type="submit" className="submit-btn">
                <Plus size={16} />
                <span>Add Goal</span>
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {goals.map((g) => (
                <div key={g._id} className="goal-item">
                  <div className="goal-left">
                    <input
                      type="checkbox"
                      className="goal-checkbox"
                      checked={g.completed}
                      onChange={() => toggleGoal(g._id, g.completed)}
                    />
                    <div>
                      <span className={`goal-title ${g.completed ? 'completed' : ''}`}>
                        {g.title}
                      </span>
                      <span className="stack-tag" style={{ marginLeft: 8 }}>
                        {g.subject}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-text"
                    onClick={() => deleteGoal(g._id)}
                    title="Delete Goal"
                  >
                    <Trash2 size={16} color="var(--text-muted)" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: HISTORY */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="flashcard-generator" style={{ flex: 1, padding: '8px 14px' }}>
                <Search size={18} color="var(--text-muted)" />
                <input
                  className="flashcard-input"
                  placeholder="Search previous questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {historyList
              .filter((h) => h.problem.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((item) => (
                <div key={item._id} className="goal-item">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 600 }}>{item.problem}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)' }}>
                      <span>{item.category}</span> • <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    className="submit-btn"
                    style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                    onClick={() => {
                      setCurrentAdvice(item);
                      setActiveTab('coach');
                    }}
                  >
                    Reopen Plan
                  </button>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* API Key Modal */}
      {isKeyModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsKeyModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Key size={22} color="var(--text-accent)" />
              <h3 style={{ fontFamily: 'var(--font-heading)' }}>AI Assistant Settings</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>
              ScholarFlow comes with built-in academic coaching. Optionally connect your free Google Gemini key for real-time live generation.
            </p>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--text-accent)',
                fontSize: '0.85rem',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              <span>Get Free Key at Google AI Studio</span>
              <ExternalLink size={14} />
            </a>

            <input
              type="password"
              className="flashcard-input"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '10px 14px'
              }}
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button className="timer-btn-secondary" onClick={() => setIsKeyModalOpen(false)}>
                Cancel
              </button>
              <button className="submit-btn" onClick={saveApiKey}>
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'var(--text-main)',
            color: 'var(--bg-app)',
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: '0.85rem',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 9999
          }}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
