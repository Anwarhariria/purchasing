<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModelPeramalan extends Model
{
    protected $table = 'model_peramalan';

    protected $fillable = [
        'versi',
        'varian',
        'parameter',
        'mae_rf',
        'mape_rf',
        'mape_ma3',
        'mape_snaive',
        'rolling_origin_results',
        'jumlah_data',
        'sumber_data',
        'is_simulated',
        'aktif',
        'trained_at',
        'artifact_path',
    ];

    protected $casts = [
        'parameter' => 'array',
        'rolling_origin_results' => 'array',
        'mae_rf' => 'float',
        'mape_rf' => 'float',
        'mape_ma3' => 'float',
        'mape_snaive' => 'float',
        'is_simulated' => 'boolean',
        'aktif' => 'boolean',
        'trained_at' => 'datetime',
    ];

    public function ramalan(): HasMany
    {
        return $this->hasMany(Ramalan::class, 'model_id');
    }

    public static function getActiveModel(): ?self
    {
        return self::where('aktif', true)->latest('id')->first();
    }
}
