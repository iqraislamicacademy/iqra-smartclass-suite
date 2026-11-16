import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

class HandwritingRequest(BaseModel):
    image: str
    lang: str

@app.post("/api/convert")
async def convert_handwriting(data: HandwritingRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY server par set nahi hai.")

    is_urdu = data.lang == "ur"
    is_hindi = data.lang == "hi"

    lang_instruction = "English text, numbers, or mathematical expressions."
    if is_urdu:
        lang_instruction = "Urdu Nastaliq handwriting. Strictly read all dots (nuqte) and diacritics."
    elif is_hindi:
        lang_instruction = "Hindi Devanagari handwriting. Strictly read all matras, bindu, and chandrabindu."

    prompt_text = (
        f"Transcribe the handwriting in this image into exact {lang_instruction}. "
        "Output ONLY the transcribed plain text. Do NOT add any greetings, explanations, or quotes."
    )

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt_text},
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": data.image
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 128
        }
    }

    try:
        response = requests.post(api_url, json=payload, headers={"Content-Type": "application/json"}, timeout=20)
        res_data = response.json()

        if "error" in res_data:
            raise HTTPException(status_code=400, detail=res_data["error"].get("message", "API Error"))

        recognized_text = ""
        candidates = res_data.get("candidates", [])
        if candidates and "content" in candidates[0]:
            parts = candidates[0]["content"].get("parts", [])
            if parts:
                recognized_text = parts[0].get("text", "").strip()

        return {"text": recognized_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")