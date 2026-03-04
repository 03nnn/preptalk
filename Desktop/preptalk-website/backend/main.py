from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json, os, re, tempfile
import logging
from datetime import datetime
from dotenv import load_dotenv

# Load variables from backend/.env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- faster-whisper (optional — graceful fallback if not installed) ---
try:
    from faster_whisper import WhisperModel
    whisper_model = WhisperModel("base")
    WHISPER_AVAILABLE = True
    logger.info("faster-whisper loaded successfully")
except Exception as e:
    whisper_model = None
    WHISPER_AVAILABLE = False
    logger.warning(f"faster-whisper not available: {e}. Transcription endpoints will return stub responses.")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# --- OpenAI-compatible LLM setup ---
LLM_API_KEY  = os.getenv("LLM_API_KEY", "")
LLM_API_BASE = os.getenv("LLM_API_BASE", "https://api.openai.com/v1")
LLM_MODEL    = os.getenv("LLM_MODEL", "gpt-4o-mini")

try:
    from openai import OpenAI as _OpenAIClient
    if not LLM_API_KEY or LLM_API_KEY == "your_api_key_here":
        raise ValueError("LLM_API_KEY not set in backend/.env")
    _llm_client = _OpenAIClient(api_key=LLM_API_KEY, base_url=LLM_API_BASE)
    LLM_AVAILABLE = True
    logger.info(f"LLM client ready: {LLM_API_BASE} / {LLM_MODEL}")
except Exception as e:
    _llm_client = None
    LLM_AVAILABLE = False
    logger.warning(f"LLM not available: {e}. AI endpoints will return stub responses.")

def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` wrappers that LLMs often add around JSON."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()

def call_llm(
    prompt: str,
    *,
    system: str = "",
    temperature: float = 0.3,
    max_tokens: int = 1024,
) -> str:
    """Call the configured OpenAI-compatible LLM and return the text response."""
    if not LLM_AVAILABLE or _llm_client is None:
        raise RuntimeError("LLM not configured. Set LLM_API_KEY in backend/.env.")
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    completion = _llm_client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return completion.choices[0].message.content or ""

def call_llm_json(prompt: str, *, system: str = "", temperature: float = 0.2) -> dict:
    """Call LLM and parse the result as JSON, stripping markdown fences."""
    raw = call_llm(prompt, system=system, temperature=temperature, max_tokens=1500)
    cleaned = _strip_markdown_fences(raw)
    return json.loads(cleaned)

# --- MongoDB Setup (optional — graceful fallback if not available) ---
try:
    from pymongo import MongoClient
    from bson.objectid import ObjectId
    MONGO_URI = os.getenv("MONGO_URI", "")
    if not MONGO_URI or "your_user" in MONGO_URI:
        raise ValueError("MONGO_URI not set in backend/.env")
    _mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000, tls=True)
    _mongo_client.server_info()  # test connection
    db = _mongo_client["soullink"]             # existing Atlas database
    users_collection      = db["preptalk_users"]
    interviews_collection = db["preptalk_interviews"]
    MONGO_AVAILABLE = True
    logger.info("MongoDB connected successfully")
except Exception as e:
    db = None
    users_collection = None
    interviews_collection = None
    MONGO_AVAILABLE = False
    logger.warning(f"MongoDB not available: {e}. Auth/persistence endpoints will return errors.")

# --- User Authentication ---
@app.post("/register")
async def register(request: Request):
    if not MONGO_AVAILABLE:
        return JSONResponse(status_code=503, content={"success": False, "message": "Database not available. Using demo mode - enter any username."})
    data = await request.json()
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return JSONResponse(status_code=400, content={"success": False, "message": "Username and password required"})
    if users_collection.find_one({"username": username}):
        return JSONResponse(status_code=400, content={"success": False, "message": "Username already exists"})
    users_collection.insert_one({"username": username, "password": password})
    return {"success": True, "message": "Registration successful", "username": username}

@app.post("/login")
async def login(request: Request):
    if not MONGO_AVAILABLE:
        # Demo mode: accept any credentials
        data = await request.json()
        username = data.get("username") or "demo-user"
        return {"success": True, "message": "Login successful (demo mode)", "username": username}
    data = await request.json()
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return JSONResponse(status_code=400, content={"success": False, "message": "Username and password required"})
    user = users_collection.find_one({"username": username})
    if not user or user.get("password") != password:
        return JSONResponse(status_code=401, content={"success": False, "message": "Invalid username or password"})
    return {"success": True, "message": "Login successful", "username": username}

# ── Shared system prompts ─────────────────────────────────────────────────────

_ANALYSIS_SYSTEM = (
    "You are PrepTalk, an expert AI interview coach with 15+ years of HR and "
    "technical recruitment experience. You speak directly to the candidate using "
    "'you'. You are warm yet honest, and your feedback is specific, actionable, "
    "and encouraging. Always ground your evaluation in what the candidate "
    "actually said — never fabricate strengths or weaknesses."
)

_ANALYSIS_JSON_SCHEMA = """Return ONLY a valid JSON object (no markdown, no commentary, no extra text) with EXACTLY these keys:
{
  "scores": {
    "fluency": <int 0-10>,
    "grammar": <int 0-10>,
    "confidence": <int 0-10>,
    "relevance": <int 0-10>,
    "overall": <int 0-10>
  },
  "analysis": {
    "strengths": ["<specific strength 1>", ...],
    "improvements": ["<specific area for improvement 1>", ...],
    "fillerWords": {
      "count": <int>,
      "words": ["<word>", ...]
    },
    "sentiment": "<positive|neutral|negative>",
    "tone": "<e.g. confident, hesitant, enthusiastic, monotone>"
  },
  "tips": ["<actionable tip 1>", "<actionable tip 2>", ...],
  "summary": "<2-3 sentence overall summary addressing the candidate directly>"
}"""

_QUESTION_SYSTEM = (
    "You are PrepTalk, an expert interview coach who crafts realistic, "
    "thought-provoking interview questions. Generate questions that test "
    "real-world competency, not textbook knowledge. Tailor the question "
    "to the specific job domain and difficulty level provided. "
    "Output ONLY the question text — no numbering, no preamble, no explanation."
)

_CHAT_SYSTEM = (
    "You are PrepTalk, an expert AI interview coach with deep knowledge of "
    "hiring practices across tech, finance, consulting, and general industries. "
    "Your audience is job seekers preparing for interviews.\n\n"
    "Guidelines:\n"
    "- Be warm, encouraging, and professional\n"
    "- Give specific, actionable advice grounded in real interview best practices\n"
    "- Use the STAR method (Situation, Task, Action, Result) when coaching on "
    "behavioral answers\n"
    "- Keep responses concise (under 250 words unless the user asks for detail)\n"
    "- Use bullet points for lists of tips or steps\n"
    "- When giving example answers, make them sound natural and conversational, "
    "not robotic\n"
    "- If the user shares a specific answer, critique it constructively: "
    "highlight what works, then suggest concrete improvements\n"
    "- Use simple English — avoid jargon unless the question is technical"
)

# --- Transcription Endpoint ---
@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    if not WHISPER_AVAILABLE:
        return JSONResponse(status_code=503, content={"error": "Whisper model not available", "transcript": "[Transcription unavailable]"})
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    try:
        segments, _ = whisper_model.transcribe(tmp_path)
        transcript = " ".join([seg.text for seg in segments])
    finally:
        os.remove(tmp_path)
    return {"transcript": transcript}

# --- Transcription + Feedback Endpoint ---

@app.post("/analyze_interview")
async def analyze_interview(
    audio: UploadFile = File(...),
    user_id: str = Form("demo-user"),
    question: str = Form(""),
    category: str = Form("")
):
    try:
        logger.info(f"analyze_interview: user={user_id}, question={question[:60]}, category={category}")

        # 1. Transcribe with Whisper
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            contents = await audio.read()
            logger.info(f"Audio size: {len(contents)} bytes")
            tmp.write(contents)
            tmp.flush()
            tmp_path = tmp.name
        try:
            if not WHISPER_AVAILABLE:
                transcript = "[Audio transcription unavailable — faster-whisper not loaded]"
            else:
                segments, _ = whisper_model.transcribe(tmp_path)
                transcript = " ".join(seg.text for seg in segments)
        finally:
            os.remove(tmp_path)

        # 2. Analyse with LLM
        user_prompt = (
            f"Interview Question: {question}\n"
            f"Category: {category}\n\n"
            f"Candidate's spoken response (transcribed from audio):\n"
            f"{transcript}\n\n"
            f"{_ANALYSIS_JSON_SCHEMA}"
        )
        logger.info(f"LLM prompt (first 200 chars): {user_prompt[:200]}")

        try:
            feedback_json = call_llm_json(user_prompt, system=_ANALYSIS_SYSTEM)
        except json.JSONDecodeError as e:
            logger.error(f"LLM JSON parse failed: {e}")
            feedback_json = _empty_feedback()
            feedback_json["error"] = "Model output was not valid JSON"
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            feedback_json = _empty_feedback()
            feedback_json["error"] = str(e)

        # Ensure required keys + override question/category from form data
        _ensure_feedback_keys(feedback_json)
        feedback_json["question"] = question
        feedback_json["category"] = category

        # 3. Save session to MongoDB
        if MONGO_AVAILABLE and db is not None:
            db["preptalk_sessions"].insert_one({
                "user_id": user_id,
                "date": datetime.utcnow(),
                "category": category,
                "question": question,
                "transcript": transcript,
                "feedback": feedback_json,
            })
            logger.info(f"Session saved for user {user_id}")
        else:
            logger.warning("MongoDB unavailable — session not persisted")

        return JSONResponse(content={"transcript": transcript, "feedback": feedback_json})

    except Exception as e:
        import traceback
        logger.error(f"Exception in analyze_interview: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

# ── Feedback helpers ──────────────────────────────────────────────────────────

def _empty_feedback() -> dict:
    return {
        "scores": {"fluency": 0, "grammar": 0, "confidence": 0, "relevance": 0, "overall": 0},
        "analysis": {"strengths": [], "improvements": [], "fillerWords": {"count": 0, "words": []}, "sentiment": "", "tone": ""},
        "tips": [],
        "summary": "",
    }

def _ensure_feedback_keys(fb: dict) -> None:
    """Fill in any missing top-level keys with safe defaults."""
    defaults = _empty_feedback()
    for key, val in defaults.items():
        fb.setdefault(key, val)
    # Normalise nested dicts
    if isinstance(fb.get("scores"), dict):
        for k in ("fluency", "grammar", "confidence", "relevance", "overall"):
            fb["scores"].setdefault(k, 0)
    if isinstance(fb.get("analysis"), dict):
        fb["analysis"].setdefault("strengths", [])
        fb["analysis"].setdefault("improvements", [])
        fb["analysis"].setdefault("fillerWords", {"count": 0, "words": []})
        fb["analysis"].setdefault("sentiment", "")
        fb["analysis"].setdefault("tone", "")

# --- Feedback Endpoint ---
@app.post("/feedback")
async def feedback(conversation: str = Form(...)):
    if not LLM_AVAILABLE:
        return JSONResponse(status_code=503, content={"error": "LLM not configured. Set LLM_API_KEY in backend/.env."})

    user_prompt = (
        f"Below is a full mock-interview transcript with multiple Q&A turns.\n"
        f"Evaluate the candidate's responses holistically.\n\n"
        f"Transcript:\n{conversation}\n\n"
        f"{_ANALYSIS_JSON_SCHEMA}"
    )
    try:
        feedback_json = call_llm_json(user_prompt, system=_ANALYSIS_SYSTEM)
        _ensure_feedback_keys(feedback_json)
    except Exception as e:
        logger.error(f"Feedback LLM error: {e}")
        feedback_json = _empty_feedback()
        feedback_json["error"] = str(e)
    return JSONResponse(content=feedback_json)

# --- Save Interview ---
@app.post("/save_interview")
async def save_interview(
    conversation: str = Form(...),
    feedback: str = Form(...),
    user_id: str = Form(None)
):
    if not MONGO_AVAILABLE or interviews_collection is None:
        return {"status": "skipped", "interview_id": None, "message": "MongoDB not available"}
    record = {
        "user_id": user_id,
        "conversation": conversation,
        "feedback": json.loads(feedback),
        "date": datetime.utcnow(),
    }
    result = interviews_collection.insert_one(record)
    return {"status": "saved", "interview_id": str(result.inserted_id)}

# --- Recent Interviews ---
@app.get("/recent_interviews")
async def recent_interviews(user_id: str):
    if not MONGO_AVAILABLE or interviews_collection is None:
        return []
    interviews = list(interviews_collection.find({"user_id": user_id}).sort("_id", -1).limit(5))
    for i in interviews:
        i["interview_id"] = str(i["_id"])
        del i["_id"]
    return interviews

# --- Progress Endpoint ---
@app.get("/progress")
async def progress(user_id: str):
    """Alias endpoint for user-progress with query param"""
    return await user_progress(user_id)

# --- User Progress ---
@app.get("/user-progress/{user_id}")
async def user_progress(user_id: str):
    if not MONGO_AVAILABLE or db is None:
        return []
    sessions = list(db["preptalk_sessions"].find({"user_id": user_id}).sort("date", -1).limit(10))
    result = []
    for s in sessions:
        s["session_id"] = str(s["_id"])
        del s["_id"]
        # Flatten: lift scores/analysis/tips from nested feedback to top level
        fb = s.get("feedback") or {}
        if isinstance(fb, dict):
            for key in ("scores", "analysis", "tips", "strong_points", "weak_points",
                        "suggestions", "overall_feedback", "summary"):
                if key in fb and key not in s:
                    s[key] = fb[key]
        # Ensure date is serializable
        if s.get("date") and hasattr(s["date"], "isoformat"):
            s["date"] = s["date"].isoformat()
        result.append(s)
    return result

# --- Sample questions (fallback pool) ---
_FALLBACK_QUESTIONS: dict = {
    "hr": [
        "Tell me about yourself and your background.",
        "Why do you want to work for our company?",
        "Where do you see yourself in 5 years?",
        "What are your strengths and weaknesses?",
        "Describe a challenging situation at work and how you handled it.",
        "Why should we hire you?",
        "How do you handle stress and pressure?",
    ],
    "technical": [
        "Explain your approach to problem-solving in your field.",
        "Describe a project where you applied your technical skills effectively.",
        "How do you stay updated with the latest technologies in your field?",
        "Explain a complex technical concept in simple terms.",
        "How would you handle a technical disagreement with a team member?",
    ],
    "behavioral": [
        "Describe a time when you had to work under pressure to meet a deadline.",
        "Tell me about a time when you had to adapt to a significant change at work.",
        "Give an example of how you worked on a team to accomplish a goal.",
        "Describe a situation where you had to resolve a conflict with a colleague.",
        "Tell me about a time when you failed and what you learned from it.",
    ],
}

@app.get("/question")
async def generate_question(
    category: str = "behavioral",
    jobDomain: str = "Software Engineer",
    difficulty: str = "Medium",
):
    import random
    category = category.lower()
    pool = _FALLBACK_QUESTIONS.get(category, _FALLBACK_QUESTIONS["behavioral"])

    if not LLM_AVAILABLE:
        return {"question": random.choice(pool), "source": "fallback"}

    difficulty_guidance = {
        "easy":   "Ask a straightforward question suitable for freshers or entry-level candidates.",
        "medium": "Ask a moderately challenging question expecting some real-world experience.",
        "hard":   "Ask a deep, scenario-based question that tests senior-level judgement and expertise.",
    }
    diff_hint = difficulty_guidance.get(difficulty.lower(), difficulty_guidance["medium"])

    examples = "\n".join(f"- {q}" for q in random.sample(pool, min(3, len(pool))))
    user_prompt = (
        f"Generate one unique {category} interview question for a **{jobDomain}** role.\n"
        f"Difficulty: {difficulty}. {diff_hint}\n\n"
        f"Avoid repeating these examples:\n{examples}\n\n"
        f"The question should feel like something a real interviewer would ask — "
        f"natural, specific, and thought-provoking. Output ONLY the question text."
    )
    try:
        question = call_llm(
            user_prompt, system=_QUESTION_SYSTEM, temperature=0.8
        ).strip().strip('"').lstrip("0123456789.) ")
        if not question or len(question) < 10:
            raise ValueError("LLM returned empty or too-short question")
        return {"question": question, "source": "llm"}
    except Exception as e:
        logger.warning(f"LLM question generation failed: {e}, using fallback")
        return {"question": random.choice(pool), "source": "fallback"}


# --- Chat / AI Assistant Endpoint ---
@app.post("/chat")
async def chat_endpoint(request: Request):
    if not LLM_AVAILABLE:
        return JSONResponse(status_code=503, content={"message": "LLM not configured. Set LLM_API_KEY in backend/.env."})
    data = await request.json()
    messages = data.get("messages", [])
    if not messages:
        return JSONResponse(status_code=400, content={"message": "No messages provided"})
    full_messages = [
        {"role": "system", "content": _CHAT_SYSTEM},
        *messages,
    ]
    try:
        completion = _llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=full_messages,
            temperature=0.7,
            max_tokens=800,
        )
        return {"message": completion.choices[0].message.content or ""}
    except Exception as e:
        logger.error(f"Chat LLM error: {e}")
        return JSONResponse(status_code=500, content={"message": f"LLM error: {e}"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
