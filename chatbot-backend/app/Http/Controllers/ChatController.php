<?php

namespace App\Http\Controllers;

use App\Models\ChatSession;
use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    // 1. Fetch all sessions (UUID bhejenge frontend ko)
    public function getSessions(Request $request)
    {
        $sessions = $request->user()->chatSessions()->select('uuid as id', 'title', 'updated_at')->orderBy('updated_at', 'desc')->get();
        return response()->json($sessions);
    }

    // 2. Fetch specific session messages using UUID
    public function getSessionMessages(Request $request, $uuid)
    {
        $session = ChatSession::where('uuid', $uuid)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        return response()->json($session->messages()->orderBy('created_at', 'asc')->get());
    }

    public function getLimit(Request $request)
    {
        $user = $request->user();
        
        $totalLimit = (int) env('CHAT_TOTAL_LIMIT', 100);
        $fileLimit = (int) env('CHAT_FILE_LIMIT', 5);
        
        $baseQuery = ChatMessage::where('sender', 'user')
            ->whereHas('session', function($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->whereDate('created_at', now()->toDateString());

        $totalPrompts = (clone $baseQuery)->count();
        $filePrompts = (clone $baseQuery)->where('text', 'like', "%\n\n[Attached File:%")->count();

        return response()->json([
            'total_used' => $totalPrompts,
            'total_limit' => $totalLimit,
            'total_remaining' => max(0, $totalLimit - $totalPrompts),
            'file_used' => $filePrompts,
            'file_limit' => $fileLimit,
            'file_remaining' => max(0, $fileLimit - $filePrompts)
        ]);
    }

    public function sendMessage(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'session_id' => 'nullable|string', // Changed to string for UUID
            'parent_id' => 'nullable|exists:chat_messages,id',
            'attachment' => 'nullable|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,json,js,ts,php,py,html,css,jpg,jpeg,png,gif,webp',
            'memory' => 'nullable|string'
        ]);

        $user = $request->user();
        $hasFile = $request->hasFile('attachment');
        $totalLimit = (int) env('CHAT_TOTAL_LIMIT', 100);
        $fileLimit = (int) env('CHAT_FILE_LIMIT', 5);

        $baseQuery = ChatMessage::where('sender', 'user')
            ->whereHas('session', function($q) use ($user) { $q->where('user_id', $user->id); })
            ->whereDate('created_at', now()->toDateString());

        $totalPrompts = (clone $baseQuery)->count();
        $filePrompts = (clone $baseQuery)->where('text', 'like', "%/storage/attachments/%")->count();

        if ($totalPrompts >= $totalLimit) return response()->json(['ai_response' => "Daily limit of {$totalLimit} prompts reached.", 'limit_reached' => true]);
        if ($hasFile && $filePrompts >= $fileLimit) return response()->json(['ai_response' => "Daily limit of {$fileLimit} uploads reached.", 'limit_reached' => true]);

        if ($request->session_id) {
            $session = ChatSession::where('uuid', $request->session_id)->first();
        } else {
            $session = ChatSession::create([
                'user_id' => $user->id,
                'title' => Str::words($request->message, 4, '...')
            ]);
        }

        $fileBase64 = null; $fileName = null; $mimeType = null; $finalMessageText = $request->message;
        
        if ($hasFile) {
            $file = $request->file('attachment');
            $path = $file->store('attachments', 'public');
            $fileUrl = asset('storage/' . $path);
            $localFilePath = storage_path('app/public/' . $path);
            $fileBase64 = base64_encode(file_get_contents($localFilePath));
            $fileName = $file->getClientOriginalName();
            $mimeType = $file->getMimeType();
            if (in_array(strtolower($file->getClientOriginalExtension()), ['jpg','jpeg','png','gif','webp'])) $finalMessageText .= "\n\n![{$fileName}]({$fileUrl})";
            else $finalMessageText .= "\n\n[📄 {$fileName}]({$fileUrl})";
        } else {
            if (preg_match('/(?:!\[.*?\]|\[.*?\])\((.*?\/storage\/attachments\/.*?)\)/', $request->message, $matches)) {
                $existingUrl = $matches[1];
                $pathParts = explode('/storage/', $existingUrl);
                if (count($pathParts) == 2) {
                    $localFilePath = storage_path('app/public/' . $pathParts[1]);
                    if (file_exists($localFilePath)) {
                        $fileBase64 = base64_encode(file_get_contents($localFilePath));
                        $fileName = basename($localFilePath);
                        $mimeType = mime_content_type($localFilePath);
                    }
                }
            }
        }

        $userMsg = ChatMessage::create(['chat_session_id' => $session->id, 'sender' => 'user', 'text' => $finalMessageText, 'parent_id' => $request->parent_id]);

        try {
            $response = Http::timeout(120)->post('http://127.0.0.1:8001/generate', [
                'message' => $request->message, 
                'file_base64' => $fileBase64,
                'file_name' => $fileName,
                'mime_type' => $mimeType,
                'memory' => $request->memory 
            ]);
            $aiText = $response->successful() ? $response->json()['ai_response'] : "AI service unavailable.";
        } catch (\Exception $e) {
            $aiText = "Connection error: " . $e->getMessage();
        }

        $aiMsg = ChatMessage::create(['chat_session_id' => $session->id, 'sender' => 'ai', 'text' => $aiText, 'parent_id' => $userMsg->id]);
        $session->touch();

        return response()->json([ 'ai_response' => $aiText, 'session_id' => $session->uuid, 'user_message_id' => $userMsg->id, 'ai_message_id' => $aiMsg->id ]);
    }

    // Rename Session Using UUID
    public function renameSession(Request $request, $uuid)
    {
        $request->validate(['title' => 'required|string|max:255']);
        
        $session = ChatSession::where('uuid', $uuid)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $session->update(['title' => $request->title]);

        return response()->json(['message' => 'Chat renamed successfully']);
    }

    // Delete Session Using UUID
    public function deleteSession(Request $request, $uuid)
    {
        $session = ChatSession::where('uuid', $uuid)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $session->delete(); 

        return response()->json(['message' => 'Chat deleted successfully']);
    }
}