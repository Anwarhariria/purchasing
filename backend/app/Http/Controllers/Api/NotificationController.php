<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    protected function formatNotif(Notification $n)
    {
        return [
            'id' => $n->id,
            'title' => $n->title,
            'desc' => $n->desc,
            'time' => $n->time,
            'targetRole' => $n->target_role,
            'target_role' => $n->target_role,
            'requestId' => $n->request_id,
            'request_id' => $n->request_id,
            'read' => (bool)$n->read,
            'created_at' => $n->created_at,
        ];
    }

    public function index(Request $request)
    {
        $role = $request->query('role');
        $query = Notification::orderBy('created_at', 'desc');

        if ($role && $role !== 'Super Admin') {
            $query->where(function ($q) use ($role) {
                $q->where('target_role', $role)
                  ->orWhere('target_role', 'Semua');
            });
        }

        $notifs = $query->get()->map(fn($n) => $this->formatNotif($n));

        return response()->json([
            'status' => 'success',
            'data' => $notifs,
        ]);
    }

    public function markAsRead($id)
    {
        $notif = Notification::find($id);

        if (!$notif) {
            return response()->json([
                'status' => 'error',
                'message' => 'Notifikasi tidak ditemukan.',
            ], 404);
        }

        $notif->read = true;
        $notif->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Notifikasi ditandai telah dibaca.',
            'data' => $this->formatNotif($notif),
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        $role = $request->input('role');
        $query = Notification::query();

        if ($role && $role !== 'Super Admin') {
            $query->where(function ($q) use ($role) {
                $q->where('target_role', $role)
                  ->orWhere('target_role', 'Semua');
            });
        }

        $query->update(['read' => true]);

        return response()->json([
            'status' => 'success',
            'message' => 'Semua notifikasi ditandai telah dibaca.',
        ]);
    }
}
