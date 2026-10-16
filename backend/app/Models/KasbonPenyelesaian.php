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
        'dicatat_oleh',
        'tanggal',
    ];

    protected $casts = [
        'nominal' => 'float',
        'tanggal' => 'date',
    ];

    public function pengajuan(): BelongsTo
    {
        return $this->belongsTo(ProcurementRequest::class, 'pengajuan_id', 'id');
    }

    public function kasbonTujuan(): BelongsTo
    {
        return $this->belongsTo(ProcurementRequest::class, 'kasbon_tujuan_id', 'id');
    }
}
