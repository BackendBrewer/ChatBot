from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Initialize Gemini Client
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY not found in .env file!")
    
client = genai.Client(api_key=api_key)

class ChatRequest(BaseModel):
    message: str

@app.post("/generate")
async def generate_response(request: ChatRequest):
    try:
        # Yahan humne model ka naam change kar ke latest kar diya hai
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=request.message,
        )
        return {"ai_response": response.text}
    
    except Exception as e:
        print(f"Error during generation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")