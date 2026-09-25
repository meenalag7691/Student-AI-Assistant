import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

def get_gemini_client(api_key=None):
    effective_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not effective_key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=effective_key)
    except Exception as e:
        print(f"[Error creating Gemini client]: {e}")
        return None

STUDENT_SYSTEM_PROMPT = """You are 'ScholarFlow AI', an elite, empathetic, and highly practical Academic Coach and Study Mentor for students.
Your mission is to help students overcome academic obstacles, boost learning efficiency, beat procrastination, and excel in exams with less stress.

Formatting Guidelines:
1. Always structure your responses with clean Markdown:
   - Use bold section titles (e.g., '### 🎯 Immediate Action Plan', '### 🧠 Study Strategy', '### ⏱️ Time-Boxing / Schedule', '### 💡 Pro-Tip').
   - Use bullet points and numbered lists for readability.
   - Highlight key concepts in **bold**.
2. Be empathetic, encouraging, and non-judgmental. Acknowledge the student's pressure.
3. Recommend scientifically proven techniques when relevant:
   - Active Recall & Spaced Repetition
   - Pomodoro Technique (e.g. 25/5 or 50/10)
   - Feynman Technique (explain like I'm 5)
   - The 5-Minute Rule for beating procrastination
   - Interleaving and Blurting
4. Keep the advice actionable, specific, and realistic for a student to start within 5 minutes.
"""

def generate_smart_fallback(problem: str, category: str = "General") -> str:
    """Provides high-quality structured guidance if live Gemini API key is not yet set."""
    p_lower = problem.lower()
    
    if any(k in p_lower for k in ["procrastinat", "focus", "distract", "phone", "lazy", "motivation"]):
        return (
            "### 🎯 5-Minute Kickstart Plan to Beat Distraction\n\n"
            "It is completely normal to struggle with focus—your brain naturally seeks easy dopamine when faced with cognitively demanding tasks. Here is your immediate strategy:\n\n"
            "1. **The 5-Minute Rule**: Don't commit to studying for 3 hours. Tell yourself: *'I will open my notebook and read for just 5 minutes.'* 80% of resistance disappears once you start.\n"
            "2. **Friction Strategy**: Put your phone in another room or turn on Do Not Disturb. Every extra obstacle between you and distraction protects your deep focus.\n"
            "3. **Pomodoro Sprint (25 + 5)**:\n"
            "   - Set a timer for 25 minutes. Work on **one single task**.\n"
            "   - Take a mandatory 5-minute break (stretch, drink water, no scrolling).\n"
            "   - After 4 cycles, reward yourself with a 20-minute rest.\n\n"
            "### 🧠 Mindset Shift\n"
            "*Action creates motivation, not the other way around.* Take one small action right now!\n\n"
            "> 💡 **Tip**: Connect your Google Gemini API key in the top settings to get live, custom-tailored solutions for your syllabus!"
        )
    elif any(k in p_lower for k in ["exam", "test", "revision", "revise", "forget", "memory"]):
        return (
            "### 📚 High-Impact Exam Prep Strategy\n\n"
            "Cramming and passive rereading have less than a 20% retention rate. Upgrade your revision with these evidence-based techniques:\n\n"
            "1. **The Blurting Method (Active Recall)**:\n"
            "   - Read a chapter or summary sheet for 10 minutes.\n"
            "   - Close the book. Write down everything you remember on a blank sheet.\n"
            "   - Re-open notes and write in red pen what you missed. Those red notes are your exact weak spots.\n"
            "2. **Past Paper Reverse Engineering**:\n"
            "   - Prioritize high-weightage questions from the last 3-5 years.\n"
            "   - Solve them under timed conditions before checking answer keys.\n"
            "3. **Spaced Interval Checklist**:\n"
            "   - Review today's topic tomorrow (Day 1), Day 3, and Day 7 to cement it in long-term memory.\n\n"
            "### ⏱️ Suggested Daily Rhythm\n"
            "- **Morning**: Difficult concepts & mathematical problem solving\n"
            "- **Afternoon**: Active recall / Blurting & flashcards\n"
            "- **Evening**: Quick summary recap & review tomorrow's goals\n\n"
            "> 💡 **Tip**: Connect your Google Gemini API key to generate customized mock test questions and personalized study timetables!"
        )
    elif any(k in p_lower for k in ["stress", "anxious", "anxiety", "overwhelm", "burnout", "sleep"]):
        return (
            "### 🧘 Reset & Calm Your Academic Stress\n\n"
            "Take a deep breath. Your grades do not define your self-worth, and panic temporarily reduces your working memory capacity. Let's decompress:\n\n"
            "1. **Physiological Sigh (Instant Calmer)**:\n"
            "   - Take two quick inhales through your nose, followed by a long, slow exhale through your mouth. Repeat 3 times to immediately lower heart rate.\n"
            "2. **Brain Dump List**:\n"
            "   - Write down every single impending deadline onto a sheet of paper.\n"
            "   - Pick just the **Top 1 Priority** for today. Put the rest away for tomorrow.\n"
            "3. **Sleep Protection**:\n"
            "   - Never sacrifice sleep before a test. Your brain solidifies memories during deep sleep cycles; all-nighters reduce test performance by up to 40%.\n\n"
            "### 🌟 Remember\n"
            "One step at a time. You only need to win the next 30 minutes, not the whole semester!"
        )
    else:
        return (
            f"### 🎯 Strategic Study Blueprint for: '{problem}'\n\n"
            "Here is a structured framework to tackle this academic challenge:\n\n"
            "1. **Deconstruct the Problem**:\n"
            "   - Break the topic into 3 smaller micro-tasks. Tackling small chunks eliminates cognitive overload.\n"
            "2. **The Feynman Technique**:\n"
            "   - Explain the concept aloud as if teaching it to a 10-year-old. Wherever you get stuck is where your understanding has gaps.\n"
            "3. **Next Immediate 15 Minutes**:\n"
            "   - Open your primary textbook or lecture slides.\n"
            "   - Write down 3 essential questions you want to be able to answer by the end of today.\n\n"
            "### 🚀 Next Steps\n"
            "- Start with the most difficult concept while your mental energy is fresh.\n"
            "- Test yourself frequently rather than just re-reading.\n\n"
            "> 💡 **Tip**: Add your Google Gemini API key in the top settings to get live, real-time AI solutions and step-by-step problem explanations!"
        )

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(path) and not os.path.isdir(path):
        return send_from_directory('.', path)
    return send_from_directory('.', 'index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    has_key = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    return jsonify({
        "status": "online",
        "has_api_key": has_key,
        "model": "gemini-2.5-flash",
        "mode": "gemini-live" if has_key else "smart-coach"
    })

@app.route('/api/save-key', methods=['POST'])
def save_api_key():
    data = request.get_json() or {}
    key = data.get('api_key', '').strip()
    if not key:
        return jsonify({"error": "No API key provided"}), 400
    
    env_path = os.path.join(os.getcwd(), '.env')
    try:
        lines = []
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                lines = [l for l in f.readlines() if not l.startswith("GEMINI_API_KEY=")]
        lines.append(f"GEMINI_API_KEY={key}\n")
        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        
        os.environ["GEMINI_API_KEY"] = key
        return jsonify({"status": "success", "message": "API Key saved successfully!"})
    except Exception as e:
        return jsonify({"error": f"Failed to save key: {str(e)}"}), 500

@app.route('/api/help', methods=['POST'])
def get_help():
    data = request.get_json()
    if not data or 'problem' not in data:
        return jsonify({'error': 'No problem text provided'}), 400

    user_problem = data.get('problem', '').strip()
    category = data.get('category', 'General')
    client_api_key = data.get('apiKey', '').strip() or None

    if not user_problem:
        return jsonify({'error': 'Please describe your study problem'}), 400

    print(f"\n[Student Problem ({category})]: {user_problem}\n")

    client = get_gemini_client(api_key=client_api_key)

    if client:
        try:
            from google.genai import types
            prompt = f"Student Category: {category}\nStudent Problem / Question: {user_problem}\n\nPlease provide personalized, highly practical, motivating advice and a step-by-step action plan."
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=STUDENT_SYSTEM_PROMPT,
                    temperature=0.7,
                )
            )
            advice_text = response.text if response and response.text else "Could not generate advice. Please try again."
            return jsonify({
                'status': 'success',
                'advice': advice_text,
                'category': category,
                'is_live_ai': True,
                'model': 'gemini-2.5-flash'
            }), 200
        except Exception as e:
            print(f"[Gemini API Error]: {e}")
            fallback_text = generate_smart_fallback(user_problem, category)
            return jsonify({
                'status': 'partial',
                'advice': fallback_text,
                'category': category,
                'is_live_ai': False,
                'api_warning': f"Gemini API error: {str(e)}. Switched to Smart Academic Coach mode."
            }), 200
    else:
        # Fallback to local smart coaching rules
        fallback_text = generate_smart_fallback(user_problem, category)
        return jsonify({
            'status': 'success',
            'advice': fallback_text,
            'category': category,
            'is_live_ai': False,
            'notice': 'Using Smart Academic Coach. Enter a Gemini API Key to enable live Gemini 2.5 Flash responses!'
        }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)