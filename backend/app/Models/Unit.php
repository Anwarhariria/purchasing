<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    protected $table = 'units';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nama',
        'kode',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'unit_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(ProcurementRequest::class, 'unit_id');
    }
}
