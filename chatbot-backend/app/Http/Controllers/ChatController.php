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
        $sessions = $request->user()->chatSessions()->select('id', 'title', 'updated_at')->orderBy('updated_at', 'desc')->get();
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
            'session_id' => 'nullable|exists:chat_sessions,id',
            'parent_id' => 'nullable|exists:chat_messages,id' // NEW
        ]);

        $user = $request->user();
        $dailyLimit = 100;

        $todayPrompts = ChatMessage::where('sender', 'user')
            ->whereHas('session', function($q) use ($user) { $q->where('user_id', $user->id); })
            ->whereDate('created_at', now()->toDateString())
            ->count();

        if ($todayPrompts >= $dailyLimit) {
            return response()->json(['ai_response' => "Daily limit reached.", 'limit_reached' => true]);
        }

        if ($request->session_id) {
            $session = ChatSession::find($request->session_id);
        } else {
            $session = ChatSession::create([
                'user_id' => $user->id,
                'title' => \Illuminate\Support\Str::words($request->message, 4, '...')
            ]);
        }

        // Save User Message with parent_id
        $userMsg = ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender' => 'user',
            'text' => $request->message,
            'parent_id' => $request->parent_id
        ]);

        try {
            $response = Http::timeout(60)->post('http://127.0.0.1:8001/generate', [
                'message' => $request->message 
            ]);
            $aiText = $response->successful() ? $response->json()['ai_response'] : "AI service unavailable.";
        } catch (\Exception $e) {
            $aiText = "Connection error." . $e->getMessage();
        }

        // Save AI response attached to the new user message
        $aiMsg = ChatMessage::create([
            'chat_session_id' => $session->id,
            'sender' => 'ai',
            'text' => $aiText,
            'parent_id' => $userMsg->id
        ]);

        $session->touch();

        return response()->json([
            'ai_response' => $aiText,
            'session_id' => $session->id,
            'user_message_id' => $userMsg->id, // NEW
            'ai_message_id' => $aiMsg->id // NEW
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
        $dailyLimit = 100;
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