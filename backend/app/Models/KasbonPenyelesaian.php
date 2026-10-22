<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KasbonPenyelesaian extends Model
{
    use HasFactory;

    protected $table = 'kasbon_penyelesaian';

    protected $fillable = [
        'pengajuan_id',
        'jenis',
        'nominal',
        'bukti_path',
        'kasbon_tujuan_id',
        'diganti_langsung_at',
        'bukti_ganti_path',
        'diganti_oleh',
        'dicatat_oleh',
        'tanggal',
    ];

    protected $casts = [
        'nominal' => 'float',
        'tanggal' => 'date',
        'diganti_langsung_at' => 'datetime',
    ];

    public function pengajuan(): BelongsTo
    {
        return $this->belongsTo(ProcurementRequest::class, 'pengajuan_id', 'id');
    }

    public function kasbonTujuan(): BelongsTo
    {
        return $this->belongsTo(ProcurementRequest::class, 'kasbon_tujuan_id', 'id');
    }

    public function digantiOlehUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diganti_oleh');
    }
}
