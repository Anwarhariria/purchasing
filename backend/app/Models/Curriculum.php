<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Curriculum extends Model
{
    use HasFactory;

    protected $table = 'curriculums';

    protected $fillable = [
        'prodi',
        'semester',
        'course',
        'menu_name',
        'ingredients',
    ];

    protected function casts(): array
    {
        return [
            'semester' => 'integer',
            'ingredients' => 'array',
        ];
    }
}
