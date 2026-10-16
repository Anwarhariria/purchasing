<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KatalogBarang extends Model
{
    use HasFactory;

    protected $table = 'katalog_barang';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'kode',
        'nama',
        'kategori',
        'satuan',
        'harga_acuan',
        'stok_tersedia',
        'target_unit',
        'aktif',
    ];

    protected function casts(): array
    {
        return [
            'harga_acuan' => 'float',
            'stok_tersedia' => 'float',
            'aktif' => 'boolean',
        ];
    }
}
