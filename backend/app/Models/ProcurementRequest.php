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
        'urgency',
        'academic_importance',
        'applicant',
        'department',
        'date',
        'need_by',
        'deadline',
        'purpose',
        'status',
        'note',
        'disbursed_amount',
        'actual_spent',
        'refund_amount',
        'deficit_amount',
        'reimbursement_status',
        'receipt_images',
    ];

    protected function casts(): array
    {
        return [
            'semester' => 'integer',
            'qty' => 'integer',
            'price' => 'float',
            'disbursed_amount' => 'float',
            'actual_spent' => 'float',
            'refund_amount' => 'float',
            'deficit_amount' => 'float',
            'receipt_images' => 'array',
        ];
    }

    public function details(): HasMany
    {
        return $this->hasMany(RequestDetail::class, 'request_id', 'id');
    }
}
