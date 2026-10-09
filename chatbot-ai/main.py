from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
import os
import base64
import tempfile
from dotenv import load_dotenv
from typing import Optional

load_dotenv()
app = FastAPI()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

class ChatRequest(BaseModel):
    message: str
    file_base64: Optional[str] = None
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    memory: Optional[str] = None  # NEW: Memory Field

@app.post("/generate")
async def generate_response(request: ChatRequest):
    try:
        contents = [request.message]
        temp_file_path = None
        
        if request.file_base64:
            file_data = base64.b64decode(request.file_base64)
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{request.file_name}") as temp_file:
                temp_file.write(file_data)
                temp_file_path = temp_file.name
                
            uploaded_file = client.files.upload(file=temp_file_path)
            contents.insert(0, uploaded_file) 

        # NEW: Attach Memory as System Instruction if it exists
        config = types.GenerateContentConfig(
            system_instruction=request.memory
        ) if request.memory and request.memory.strip() else None

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=config
        )

        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

        return {"ai_response": response.text}
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")