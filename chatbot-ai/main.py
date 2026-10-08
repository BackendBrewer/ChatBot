import os
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai

# .env file se API key load karein
load_dotenv()

# Naya GenAI client initialize karein
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    user_id: int

@app.get("/")
def read_root():
    return {"status": "Active", "message": "Python AI Microservice is running!"}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # Pro ki jagah Flash model use karein jiski free limit zyada hai
        response = client.models.generate_content(
            model="gemini-3.5-flash", 
            contents=request.message
        )
        
        ai_reply = response.text

    except Exception as e:
        ai_reply = f"API Error: {str(e)}"

    return {
        "status": "success",
        "reply": ai_reply,
        "user_id": request.user_id
    }