<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'code_id',
        'name',
        'email',
        'password',
        'role',
        'unit_id',
        'department',
        'status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'Super Admin';
    }

    public function isKeuanganKitchen(): bool
    {
        return $this->role === 'Keuangan Kitchen';
    }

    public function isKeuanganUmum(): bool
    {
        return $this->role === 'Keuangan Umum';
    }

    public function isAsdosKitchen(): bool
    {
        return $this->role === 'Asdos Kitchen';
    }

    public function isKoordinatorLab(): bool
    {
        return $this->role === 'Koordinator Lab';
    }

    public function isKoordinatorUnit(): bool
    {
        return $this->role === 'Koordinator Unit';
    }

    public function isStafUnit(): bool
    {
        return $this->role === 'Staf Unit';
    }

    public function isKaprodi(): bool
    {
        return $this->role === 'Kaprodi';
    }

    /**
     * Mengembalikan slug unit resmi Alur B bila user adalah Staf/Koordinator unit Alur B
     */
    public function getUnitSlugAlurB(): ?string
    {
        if (!empty($this->unit_id)) {
            return $this->unit_id;
        }

        $dept = strtoupper($this->department ?? '');
        $email = strtolower($this->email ?? '');

        if (str_contains($dept, 'PMB') || str_contains($dept, 'PENERIMAAN') || str_contains($email, 'pmb')) return 'PMB';
        if (str_contains($dept, 'PERPUS') || str_contains($email, 'perpus')) return 'PERPUS';
        if (str_contains($dept, 'SEKRETARIAT S1') || str_contains($dept, 'SEKR-S1') || str_contains($email, 'sekre.s1')) return 'SEKR-S1';
        if (str_contains($dept, 'SEKRETARIAT S2') || str_contains($dept, 'SEKR-S2') || str_contains($email, 'sekre.s2')) return 'SEKR-S2';
        if (str_contains($dept, 'SEKRETARIAT D3') || str_contains($dept, 'SEKR-D3') || str_contains($email, 'sekre.d3') || str_contains($email, 'sekre@')) return 'SEKR-D3';
        if (str_contains($dept, 'LSP') || str_contains($dept, 'SERTIFIKASI') || str_contains($email, 'lsp')) return 'LSP';

        return null;
    }
}
