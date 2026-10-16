<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProcurementActivityLog extends Model
{
    use HasFactory;

    protected $table = 'procurement_activity_logs';

    protected $fillable = [
        'procurement_request_id',
        'user_id',
        'actor_name',
        'actor_role',
        'action',
        'status_from',
        'status_to',
        'notes',
    ];

    protected static function booted()
    {
        static::creating(function ($log) {
            if (empty($log->status_to)) {
                $req = $log->request ?? ProcurementRequest::find($log->procurement_request_id);
                $log->status_to = $req?->status ?? 'DIAJUKAN';
            }
        });
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(ProcurementRequest::class, 'procurement_request_id', 'id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
