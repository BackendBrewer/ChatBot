<?php

namespace App\Http\Controllers;

use App\Models\ChatSession;
use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    // 1. User ki saari sessions fetch karna (Sidebar ke liye)
    public function getSessions(Request $request)
    {
        $sessions = $request->user()->chatSessions()->select('id', 'title')->get();
        return response()->json($sessions);
    }

    // 2. Ek specific session ke messages fetch karna
    public function getSessionMessages(Request $request, $id)
    {
        $session = ChatSession::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        return response()->json($session->messages()->orderBy('created_at', 'asc')->get());
    }

    // 3. Naya message bhejna aur Python AI se response lena
    public function sendMessage(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'session_id' => 'nullable|exists:chat_sessions,id'
        ]);

        $user = $request->user();
        $isNewSession = false;
        $dailyLimit = 15;

        $todayPrompts = ChatMessage::where('sender', 'user')
            ->whereHas('session', function($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->whereDate('created_at', now()->toDateString())
            ->count();

        if ($todayPrompts >= $dailyLimit) {
            return response()->json([
                'ai_response' => "You've reached your daily limit of {$dailyLimit} prompts. Please upgrade to Pro or try again tomorrow!",
                'limit_reached' => true
            ]);
        }

        // Agar session_id nahi aayi, toh naya session banayen
        if ($request->session_id) {
            $session = ChatSession::find($request->session_id);
        } else {
            $isNewSession = true;
            $session = ChatSession::create([
                'user_id' => $user->id,
                // Pehle message ke shuru ke kuch words ko Title bana dein
                'title' => Str::words($request->message, 4, '...') 
            ]);
        }

        // User ka message database mein save karein
        ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender' => 'user',
            'text' => $request->message
        ]);

        // Python AI API ko call karein (Port 8001)
        try {
            $response = Http::post('http://127.0.0.1:8001/generate', [
                // Yahan ensure karein ke Python API ko jo key chahiye (prompt ya message) wohi bhej rahe hain.
                // Mostly hum 'message' ya 'prompt' use karte hain. Main yahan 'message' bhej raha hoon.
                'message' => $request->message 
            ]);

            if ($response->successful()) {
                // Python se response receive karein (key 'reply' ya 'ai_response' ho sakti hai)
                $data = $response->json();
                $aiText = $data['ai_response'] ?? $data['reply'] ?? "Error: Missing response key from Python.";
            } else {
                $aiText = "Sorry, the AI service is currently unavailable.";
            }
        } catch (\Exception $e) {
            $aiText = "Error: Could not connect to Python AI Service.";
        }

        // AI ka response database mein save karein
        ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender' => 'ai',
            'text' => $aiText
        ]);

        return response()->json([
            'ai_response' => $aiText,
            'session_id' => $session->id
        ]);
    }

    public function renameSession(Request $request, $id)
    {
        $request->validate(['title' => 'required|string|max:255']);
        
        $session = ChatSession::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $session->update(['title' => $request->title]);

        return response()->json(['message' => 'Chat renamed successfully']);
    }

    public function deleteSession(Request $request, $id)
    {
        $session = ChatSession::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $session->delete(); // Is se related messages bhi cascade delete ho jayenge

        return response()->json(['message' => 'Chat deleted successfully']);
    }

    public function getLimit(Request $request)
    {
        $dailyLimit = 15;
        $user = $request->user();
        
        $todayPrompts = ChatMessage::where('sender', 'user')
            ->whereHas('session', function($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->whereDate('created_at', now()->toDateString())
            ->count();

        return response()->json([
            'used' => $todayPrompts,
            'limit' => $dailyLimit,
            'remaining' => max(0, $dailyLimit - $todayPrompts)
        ]);
    }
}