// ==========================================================================
// ScholarFlow AI - Frontend Logic & API Integration
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const problemInput = document.getElementById('problemInput');
    const helpBtn = document.getElementById('helpBtn');
    const btnSpinner = document.getElementById('btnSpinner');
    const charCount = document.getElementById('charCount');
    const clearInputBtn = document.getElementById('clearInputBtn');
    
    // Status & Nav Elements
    const aiStatusBadge = document.getElementById('aiStatusBadge');
    const aiStatusText = document.getElementById('aiStatusText');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const apiKeyBtn = document.getElementById('apiKeyBtn');
    
    // Response Elements
    const responseSection = document.getElementById('responseSection');
    const responseBody = document.getElementById('responseBody');
    const responseCategory = document.getElementById('responseCategory');
    const responseModelTag = document.getElementById('responseModelTag');
    const copyBtn = document.getElementById('copyBtn');
    const ttsBtn = document.getElementById('ttsBtn');
    const ttsBtnText = document.getElementById('ttsBtnText');
    
    // Modal Elements
    const apiKeyModal = document.getElementById('apiKeyModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const toggleKeyVisibility = document.getElementById('toggleKeyVisibility');
    
    // Toast Element
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');

    // State Variables
    let currentCategory = 'Focus & Procrastination';
    let lastResponseText = '';
    let speechSynth = window.speechSynthesis;
    let currentUtterance = null;

    // --------------------------------------------------------------------------
    // 1. Theme Management (Dark / Light)
    // --------------------------------------------------------------------------
    function initTheme() {
        const savedTheme = localStorage.getItem('scholar_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('scholar_theme', newTheme);
        showToast(newTheme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled');
    });

    initTheme();

    // --------------------------------------------------------------------------
    // 2. AI Backend Status Check
    // --------------------------------------------------------------------------
    async function checkBackendStatus() {
        try {
            const res = await fetch('/api/status');
            if (res.ok) {
                const data = await res.json();
                if (data.has_api_key) {
                    aiStatusBadge.className = 'status-badge status-live';
                    aiStatusText.textContent = 'Live Gemini 2.5 Flash';
                    aiStatusBadge.title = 'Connected to Google Gemini 2.5 Flash';
                } else {
                    aiStatusBadge.className = 'status-badge status-coach';
                    aiStatusText.textContent = 'Smart Coach Mode';
                    aiStatusBadge.title = 'Using local Smart Coach. Add Gemini API Key for real-time model!';
                }
            } else {
                throw new Error('Status failed');
            }
        } catch (err) {
            aiStatusBadge.className = 'status-badge status-coach';
            aiStatusText.textContent = 'Backend Offline';
            aiStatusBadge.title = 'Make sure python app.py is running';
        }
    }

    checkBackendStatus();

    // --------------------------------------------------------------------------
    // 3. Topic Chips Selection
    // --------------------------------------------------------------------------
    const topicChips = document.querySelectorAll('#topicChips .chip');
    topicChips.forEach(chip => {
        chip.addEventListener('click', () => {
            topicChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentCategory = chip.getAttribute('data-category');
            const newPlaceholder = chip.getAttribute('data-placeholder');
            if (newPlaceholder) {
                problemInput.setAttribute('placeholder', newPlaceholder);
            }
            problemInput.focus();
        });
    });

    // --------------------------------------------------------------------------
    // 4. Quick Prompts & Textarea Handlers
    // --------------------------------------------------------------------------
    const promptPills = document.querySelectorAll('.prompt-pill');
    promptPills.forEach(pill => {
        pill.addEventListener('click', () => {
            problemInput.value = pill.getAttribute('data-prompt');
            updateCharCount();
            problemInput.focus();
        });
    });

    function updateCharCount() {
        const len = problemInput.value.length;
        charCount.textContent = `${len} / 1500`;
    }

    problemInput.addEventListener('input', updateCharCount);

    clearInputBtn.addEventListener('click', () => {
        problemInput.value = '';
        updateCharCount();
        problemInput.focus();
    });

    // Keyboard shortcut: Ctrl + Enter to submit
    problemInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            helpBtn.click();
        }
    });

    // --------------------------------------------------------------------------
    // 5. Submit Problem Request
    // --------------------------------------------------------------------------
    helpBtn.addEventListener('click', async () => {
        const userText = problemInput.value.trim();

        if (!userText) {
            showToast('Please describe your study problem first!', 'warning');
            problemInput.focus();
            return;
        }

        // Set Loading State
        helpBtn.classList.add('loading');
        helpBtn.disabled = true;

        const storedKey = localStorage.getItem('scholar_gemini_key') || '';

        try {
            const res = await fetch('/api/help', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    problem: userText,
                    category: currentCategory,
                    apiKey: storedKey
                })
            });

            const data = await res.json();

            if (res.ok) {
                displayAdvice(data.advice, data.category, data.is_live_ai);
                if (data.is_live_ai) {
                    aiStatusBadge.className = 'status-badge status-live';
                    aiStatusText.textContent = 'Live Gemini 2.5 Flash';
                }
            } else {
                showToast(data.error || 'Failed to get advice', 'error');
            }
        } catch (err) {
            console.error('Request failed:', err);
            showToast('Could not reach backend. Please ensure app.py is running!', 'error');
        } finally {
            helpBtn.classList.remove('loading');
            helpBtn.disabled = false;
        }
    });

    // --------------------------------------------------------------------------
    // 6. Markdown Rendering & Response Display
    // --------------------------------------------------------------------------
    function renderMarkdown(rawText) {
        if (window.marked && typeof window.marked.parse === 'function') {
            return window.marked.parse(rawText);
        }
        
        // Lightweight built-in fallback parser
        let html = rawText
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
            .replace(/`([^`]+)`/gim, '<code>$1</code>')
            .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
            .replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>')
            .replace(/\n\n+/g, '</p><p>');

        return `<p>${html}</p>`;
    }

    function displayAdvice(markdownAdvice, category, isLiveAi) {
        lastResponseText = markdownAdvice;
        responseBody.innerHTML = renderMarkdown(markdownAdvice);
        responseCategory.textContent = category || currentCategory;

        if (isLiveAi) {
            responseModelTag.textContent = 'Gemini 2.5 Flash';
            responseModelTag.style.background = 'rgba(16, 185, 129, 0.12)';
            responseModelTag.style.color = '#10b981';
        } else {
            responseModelTag.textContent = 'Smart Coach Mode';
            responseModelTag.style.background = 'rgba(245, 158, 11, 0.12)';
            responseModelTag.style.color = '#f59e0b';
        }

        responseSection.style.display = 'block';
        responseSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // --------------------------------------------------------------------------
    // 7. Follow-up Chip Actions
    // --------------------------------------------------------------------------
    const followupChips = document.querySelectorAll('.followup-chip');
    followupChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            problemInput.value = `${problemInput.value.trim()}\n\n[Follow-up]: ${query}`;
            updateCharCount();
            helpBtn.click();
        });
    });

    // --------------------------------------------------------------------------
    // 8. Copy to Clipboard
    // --------------------------------------------------------------------------
    copyBtn.addEventListener('click', async () => {
        if (!lastResponseText) return;
        try {
            await navigator.clipboard.writeText(lastResponseText);
            showToast('Advice copied to clipboard! 📋');
        } catch (err) {
            showToast('Unable to copy text', 'error');
        }
    });

    // --------------------------------------------------------------------------
    // 9. Text-to-Speech (Listen aloud)
    // --------------------------------------------------------------------------
    ttsBtn.addEventListener('click', () => {
        if (!speechSynth) {
            showToast('Speech not supported on this browser', 'error');
            return;
        }

        if (speechSynth.speaking) {
            speechSynth.cancel();
            ttsBtn.classList.remove('playing');
            ttsBtnText.textContent = 'Listen';
            return;
        }

        const plainText = responseBody.innerText;
        if (!plainText) return;

        currentUtterance = new SpeechSynthesisUtterance(plainText);
        currentUtterance.rate = 1.05;
        currentUtterance.pitch = 1.0;

        currentUtterance.onstart = () => {
            ttsBtn.classList.add('playing');
            ttsBtnText.textContent = 'Stop';
        };

        currentUtterance.onend = () => {
            ttsBtn.classList.remove('playing');
            ttsBtnText.textContent = 'Listen';
        };

        currentUtterance.onerror = () => {
            ttsBtn.classList.remove('playing');
            ttsBtnText.textContent = 'Listen';
        };

        speechSynth.speak(currentUtterance);
    });

    // --------------------------------------------------------------------------
    // 10. API Key Modal Management
    // --------------------------------------------------------------------------
    apiKeyBtn.addEventListener('click', () => {
        const stored = localStorage.getItem('scholar_gemini_key') || '';
        if (stored) {
            apiKeyInput.value = stored;
        }
        apiKeyModal.classList.add('active');
        apiKeyInput.focus();
    });

    function closeModal() {
        apiKeyModal.classList.remove('active');
    }

    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    apiKeyModal.addEventListener('click', (e) => {
        if (e.target === apiKeyModal) {
            closeModal();
        }
    });

    toggleKeyVisibility.addEventListener('click', () => {
        const isPwd = apiKeyInput.type === 'password';
        apiKeyInput.type = isPwd ? 'text' : 'password';
        toggleKeyVisibility.textContent = isPwd ? '🔒' : '👁️';
    });

    saveApiKeyBtn.addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            showToast('Please enter an API key', 'warning');
            return;
        }

        // Store locally in browser
        localStorage.setItem('scholar_gemini_key', key);

        // Also save to backend .env file
        try {
            const res = await fetch('/api/save-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: key })
            });
            if (res.ok) {
                showToast('Gemini API key saved & connected! ✨');
                checkBackendStatus();
                closeModal();
            } else {
                showToast('Key saved in browser', 'success');
                closeModal();
            }
        } catch (err) {
            showToast('Key saved in browser storage', 'success');
            closeModal();
        }
    });

    // --------------------------------------------------------------------------
    // 11. Toast System
    // --------------------------------------------------------------------------
    let toastTimeout;
    function showToast(msg, type = 'info') {
        clearTimeout(toastTimeout);
        toastMessage.textContent = msg;
        toast.classList.add('show');
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});