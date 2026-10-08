<?php

namespace App\Http\Controllers;

use App\Models\Chat;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function sendMessage(Request $request)
    {
        // 1. Input Validation
        $request->validate([
            'message' => 'required|string',
            'user_id' => 'required|exists:users,id' // Make sure user exists
        ]);

        $userId = $request->input('user_id');
        $userMessage = $request->input('message');

        // 2. Database mein user ka message save karein
        $chat = Chat::create([
            'user_id' => $userId,
            'user_message' => $userMessage,
            'ai_response' => null // Abhi AI ka reply nahi aaya
        ]);

        try {
            // 3. Python API (FastAPI) ko request bhejein
            $response = Http::timeout(30)->post('http://127.0.0.1:8000/api/chat', [
                'message' => $userMessage,
                'user_id' => $userId,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $aiReply = $data['reply'];

                // 4. Python se reply aane ke baad database update karein
                $chat->update([
                    'ai_response' => $aiReply
                ]);

                return response()->json([
                    'status' => 'success',
                    'chat_id' => $chat->id,
                    'user_message' => $userMessage,
                    'ai_response' => $aiReply
                ]);
            }

            return response()->json(['error' => 'AI Service ne invalid response diya.'], 500);

        } catch (\Exception $e) {
            // Agar Python server band hua toh
            return response()->json(['error' => 'Python AI Server se connect nahi ho saka. Ensure it is running on port 8000.'], 500);
        }
    }
}