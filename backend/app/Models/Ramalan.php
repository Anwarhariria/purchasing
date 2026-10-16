<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ramalan extends Model
{
    protected $table = 'ramalan';

    protected $fillable = [
        'unit_id',
        'katalog_barang_id',
        'periode',
        'qty_prediksi',
        'qty_ma3',
        'qty_snaive',
        'model_id',
        'tanpa_model',
    ];

    protected $casts = [
        'qty_prediksi' => 'float',
        'qty_ma3' => 'float',
        'qty_snaive' => 'float',
        'tanpa_model' => 'boolean',
    ];

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function katalogBarang(): BelongsTo
    {
        return $this->belongsTo(KatalogBarang::class, 'katalog_barang_id');
    }

    public function modelPeramalan(): BelongsTo
    {
        return $this->belongsTo(ModelPeramalan::class, 'model_id');
    }
}
