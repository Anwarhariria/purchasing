<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use Illuminate\Database\Eloquent\SoftDeletes;

class RequestDetail extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code_id',
        'request_id',
        'name',
        'qty',
        'needed_qty',
        'stock_in_lab',
        'unit',
        'price',
        'qty_final',
        'alasan_hapus',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'float',
            'qty_final' => 'float',
            'needed_qty' => 'float',
            'stock_in_lab' => 'float',
            'price' => 'float',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(ProcurementRequest::class, 'request_id', 'id');
    }
}
