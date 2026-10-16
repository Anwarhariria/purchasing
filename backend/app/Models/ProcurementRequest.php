<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProcurementRequest extends Model
{
    use HasFactory;

    protected $table = 'requests';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'item',
        'category',
        'prodi',
        'semester',
        'course',
        'menu',
        'qty',
        'unit',
        'price',
        'academic_importance',
        'applicant',
        'pemohon_id',
        'department',
        'date',
        'need_by',
        'deadline',
        'purpose',
        'alur',
        'unit_kerja',
        'unit_id',
        'status',
        'note',
        'disbursed_amount',
        'dana_diterima',
        'actual_spent',
        'refund_amount',
        'deficit_amount',
        'receipt_images',
        'rejection_reason',
        'faktor_f',
        'catatan_keuangan',
        'nominal_transfer',
        'bukti_transfer',
        'sumber',
    ];

    public function scopeRiil($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('sumber')->orWhere('sumber', '!=', 'simulasi');
        });
    }

    protected function casts(): array
    {
        return [
            'semester' => 'integer',
            'qty' => 'integer',
            'price' => 'float',
            'disbursed_amount' => 'float',
            'dana_diterima' => 'float',
            'actual_spent' => 'float',
            'refund_amount' => 'float',
            'deficit_amount' => 'float',
            'receipt_images' => 'array',
            'faktor_f' => 'float',
            'nominal_transfer' => 'float',
        ];
    }

    public function details(): HasMany
    {
        return $this->hasMany(RequestDetail::class, 'request_id', 'id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ProcurementActivityLog::class, 'procurement_request_id', 'id')->orderBy('created_at', 'asc');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(StatusLog::class, 'pengajuan_id', 'id')->orderBy('created_at', 'asc');
    }

    public function penyelesaian(): HasMany
    {
        return $this->hasMany(KasbonPenyelesaian::class, 'pengajuan_id', 'id')->orderBy('created_at', 'asc');
    }

    public function carryOverTujuan(): HasMany
    {
        return $this->hasMany(KasbonPenyelesaian::class, 'kasbon_tujuan_id', 'id');
    }
}
