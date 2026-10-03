<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LabStock extends Model
{
    use HasFactory;

    protected $table = 'lab_stocks';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'category',
        'current_stock',
        'unit',
        'min_stock',
        'cost_per_unit',
        'last_restocked',
        'expiry_date',
        'location',
    ];

    protected function casts(): array
    {
        return [
            'current_stock' => 'float',
            'min_stock' => 'float',
            'cost_per_unit' => 'float',
            'last_restocked' => 'date',
            'expiry_date' => 'date',
        ];
    }
}
