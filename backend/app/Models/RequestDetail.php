<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'code_id',
        'request_id',
        'name',
        'qty',
        'needed_qty',
        'stock_in_lab',
        'unit',
        'price',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'float',
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
