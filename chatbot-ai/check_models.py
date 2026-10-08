import os
import google.generativeai as genai
from dotenv import load_dotenv

# .env file load karein
load_dotenv()

# API key configure karein
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Available Models for generateContent:\n")

# Sirf wo models list karein jo text generation support karte hain
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)