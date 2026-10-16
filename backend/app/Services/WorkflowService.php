<?php

namespace App\Services;

use App\Enums\StatusPengajuan;
use App\Models\ProcurementRequest;
use App\Models\StatusLog;
use App\Models\ProcurementActivityLog;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkflowService
{
    /**
     * Map transisi sah per alur
     */
    protected static array $transitions = [
        'A' => [
            StatusPengajuan::DIAJUKAN->value => [
                StatusPengajuan::DIVERIFIKASI_KOORD->value,
                StatusPengajuan::DITOLAK_KOORD->value,
            ],
            StatusPengajuan::DITOLAK_KOORD->value => [
                StatusPengajuan::DIAJUKAN->value,
            ],
            StatusPengajuan::DIVERIFIKASI_KOORD->value => [
                StatusPengajuan::DISETUJUI_KAPRODI->value,
                StatusPengajuan::DITOLAK_KAPRODI->value,
            ],
            StatusPengajuan::DITOLAK_KAPRODI->value => [
                StatusPengajuan::DIAJUKAN->value,
                StatusPengajuan::DIVERIFIKASI_KOORD->value,
            ],
            StatusPengajuan::DISETUJUI_KAPRODI->value => [
                StatusPengajuan::DANA_DICAIRKAN->value,
                StatusPengajuan::DITOLAK_KEUANGAN->value,
            ],
            StatusPengajuan::DANA_DICAIRKAN->value => [
                StatusPengajuan::BARANG_DITERIMA->value,
            ],
            StatusPengajuan::BARANG_DITERIMA->value => [
                StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value,
            ],
            StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value => [
                StatusPengajuan::SELESAI->value,
            ],
        ],
        'B' => [
            StatusPengajuan::DIAJUKAN->value => [
                StatusPengajuan::DIVERIFIKASI_KOORD->value,
                StatusPengajuan::DITOLAK_KOORD->value,
            ],
            StatusPengajuan::DITOLAK_KOORD->value => [
                StatusPengajuan::DIAJUKAN->value,
            ],
            StatusPengajuan::DIVERIFIKASI_KOORD->value => [
                StatusPengajuan::SEDANG_DIBELANJAKAN->value,
                StatusPengajuan::DITOLAK_KEUANGAN->value,
            ],
            StatusPengajuan::SEDANG_DIBELANJAKAN->value => [
                StatusPengajuan::BARANG_DITERIMA->value,
            ],
            StatusPengajuan::BARANG_DITERIMA->value => [
                StatusPengajuan::SELESAI->value,
            ],
        ],
    ];

    /**
     * Menentukan Alur ('A' atau 'B') dari model pengajuan
     */
    public static function resolveWorkflow(ProcurementRequest $req): string
    {
        if (!empty($req->alur)) {
            return strtoupper(trim($req->alur));
        }

        // Cek indikator Alur B
        if (!empty($req->unit_kerja) || (!empty($req->category) && $req->category !== 'Bahan Praktik Masak')) {
            return 'B';
        }

        return 'A';
    }

    /**
     * Memvalidasi apakah transisi sah berdasarkan SRS
     */
    public static function validateTransition(
        ProcurementRequest $req,
        string $toStatus,
        ?User $user = null,
        ?string $catatan = null,
        ?string $actingRole = null,
        bool $isFinancialDecision = false
    ): void {
        $fromStatus = $req->status;
        $alur = self::resolveWorkflow($req);

        // 1. Cek apakah status tujuan ada di enum
        if (!in_array($toStatus, StatusPengajuan::values())) {
            throw ValidationException::withMessages([
                'status' => ["Status '{$toStatus}' tidak valid dalam sistem."],
            ]);
        }

        // Status keputusan keuangan hanya boleh dicapai lewat POST /requests/{id}/keputusan-keuangan
        $financialStatuses = [
            StatusPengajuan::DANA_DICAIRKAN->value,
            StatusPengajuan::SEDANG_DIBELANJAKAN->value,
            StatusPengajuan::DITOLAK_KEUANGAN->value,
        ];
        if (in_array($toStatus, $financialStatuses, true) && !$isFinancialDecision) {
            throw ValidationException::withMessages([
                'status' => [
                    "Transisi status ke '{$toStatus}' hanya dapat dilakukan melalui endpoint keputusan keuangan (/requests/{id}/keputusan-keuangan)."
                ],
            ]);
        }

        // 2. Cek apakah ada transisi yang sah dari $fromStatus ke $toStatus pada alur terkait
        $allowedTargets = self::$transitions[$alur][$fromStatus] ?? [];
        if (!in_array($toStatus, $allowedTargets)) {
            throw ValidationException::withMessages([
                'status' => [
                    "Transisi status dari '{$fromStatus}' ke '{$toStatus}' tidak diizinkan pada Alur {$alur}."
                ],
            ]);
        }

        // 3. Validasi alasan penolakan wajib untuk status penolakan
        $isRejection = in_array($toStatus, [
            StatusPengajuan::DITOLAK_KOORD->value,
            StatusPengajuan::DITOLAK_KAPRODI->value,
            StatusPengajuan::DITOLAK_KEUANGAN->value,
        ]);
        if ($isRejection && empty(trim($catatan ?? ''))) {
            throw ValidationException::withMessages([
                'catatan' => ['Catatan alasan penolakan wajib diisi.'],
            ]);
        }

        // 4. Role Authorization Check
        if ($user === null && $actingRole !== 'Sistem') {
            throw ValidationException::withMessages([
                'user' => ['Pengguna wajib terautentikasi untuk melakukan aksi ini.'],
            ]);
        }

        $effectiveRole = $actingRole ?? $user?->role ?? 'Sistem';

        if ($effectiveRole === 'Sistem') {
            // Peran Sistem hanya diizinkan untuk dua transisi auto-konfirmasi ini:
            // Alur A: DANA_DICAIRKAN -> BARANG_DITERIMA
            // Alur B: SEDANG_DIBELANJAKAN -> BARANG_DITERIMA
            $isAllowedSystemTransition =
                ($alur === 'A' && $fromStatus === StatusPengajuan::DANA_DICAIRKAN->value && $toStatus === StatusPengajuan::BARANG_DITERIMA->value) ||
                ($alur === 'B' && $fromStatus === StatusPengajuan::SEDANG_DIBELANJAKAN->value && $toStatus === StatusPengajuan::BARANG_DITERIMA->value);

            if (!$isAllowedSystemTransition) {
                throw ValidationException::withMessages([
                    'role' => ['Peran Sistem hanya diizinkan melakukan auto-konfirmasi penerimaan barang setelah 72 jam.'],
                ]);
            }
        } else {
            // Super Admin tidak berwenang melakukan transisi status pengadaan (hanya kelola akun, master data, dan memantau)
            if ($effectiveRole === 'Super Admin' || ($user && $user->isSuperAdmin())) {
                throw ValidationException::withMessages([
                    'role' => ['Super Admin tidak berwenang melakukan transisi status pengadaan.'],
                ]);
            }

            self::checkRolePermission($alur, $fromStatus, $toStatus, $req, $user, $effectiveRole);
        }

        // 5. Syarat khusus Alur B: BARANG_DITERIMA -> SELESAI hanya bila bon sudah diinput
        if ($alur === 'B' && $toStatus === StatusPengajuan::SELESAI->value) {
            $hasReceipt = !empty($req->receipt_images) && count((array)$req->receipt_images) > 0;
            $hasActualSpent = !is_null($req->actual_spent) && (float)$req->actual_spent > 0;
            if (!$hasReceipt && !$hasActualSpent) {
                throw ValidationException::withMessages([
                    'status' => ['Penyelesaian Alur B membutuhkan bon belanja yang sudah diinput.'],
                ]);
            }
        }

        // 6. Syarat khusus Alur A (Kitchen): LAPORAN_BELANJA_DIAJUKAN -> SELESAI
        // Pengajuan baru bisa ditutup (SELESAI) hanya bila: selisih = 0, atau penyelesaiannya sudah tercatat.
        if ($alur === 'A' && $toStatus === StatusPengajuan::SELESAI->value) {
            $danaDiterima = (float)($req->dana_diterima > 0 ? $req->dana_diterima : ($req->disbursed_amount ?? 0));
            $actualSpent = (float)($req->actual_spent ?? 0);
            $selisih = $actualSpent - $danaDiterima;

            if ($selisih != 0) {
                $hasPenyelesaian = \App\Models\KasbonPenyelesaian::where('pengajuan_id', $req->id)->exists();
                if (!$hasPenyelesaian) {
                    throw ValidationException::withMessages([
                        'status' => [
                            $selisih < 0
                                ? 'Terdapat sisa dana yang belum disetorkan (selisih Rp ' . number_format(abs($selisih), 0, ',', '.') . '). Catat bukti setoran terlebih dahulu sebelum menutup pengajuan.'
                                : 'Terdapat kekurangan dana belanja (tombok Rp ' . number_format($selisih, 0, ',', '.') . '). Catat carry-over terlebih dahulu sebelum menutup pengajuan.'
                        ],
                    ]);
                }
            }
        }
    }

    /**
     * Pengecekan otorisasi peran berdasarkan SRS
     */
    protected static function checkRolePermission(
        string $alur,
        string $fromStatus,
        string $toStatus,
        ProcurementRequest $req,
        ?User $user,
        string $role
    ): void {
        // Alur A (Kitchen)
        if ($alur === 'A') {
            if ($fromStatus === StatusPengajuan::DIAJUKAN->value) {
                // Koordinator Lab
                if ($role !== 'Koordinator Lab') {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Koordinator Lab yang berhak memverifikasi/menolak pengajuan ini.'],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::DITOLAK_KOORD->value) {
                // Asdos revisi & ajukan ulang (hanya pemohon)
                $isApplicant = ($req->pemohon_id && $user && $user->id == $req->pemohon_id) || ($user && $user->name === $req->applicant);
                if ($role !== 'Asdos Kitchen' || !$isApplicant) {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Asdos pemohon yang dapat mengajukan ulang pengajuan ini.'],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::DIVERIFIKASI_KOORD->value) {
                // Kaprodi
                if ($role !== 'Kaprodi') {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Kaprodi yang berhak menyetujui/menolak pengajuan ini.'],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::DITOLAK_KAPRODI->value) {
                // Kembali ke antrean Koordinator Lab
                if (!in_array($role, ['Koordinator Lab', 'Kaprodi', 'Asdos Kitchen'], true)) {
                    throw ValidationException::withMessages([
                        'role' => ['Peran Anda tidak diizinkan mengembalikan pengajuan ke antrean Koordinator.'],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::DISETUJUI_KAPRODI->value) {
                // Keuangan Kitchen
                if ($role !== 'Keuangan Kitchen') {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Keuangan Kitchen yang berhak mencairkan dana atau menolak pengajuan Alur A.'],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::DANA_DICAIRKAN->value) {
                // Asdos konfirmasi barang diterima
                if ($role !== 'Asdos Kitchen' || ($user && $user->name !== $req->applicant)) {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Asdos pemohon yang berhak mengonfirmasi barang diterima.'],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::BARANG_DITERIMA->value) {
                // Asdos unggah bon / lapor belanja
                if ($role !== 'Asdos Kitchen' || ($user && $user->name !== $req->applicant)) {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Asdos pemohon yang berhak mengajukan laporan belanja.'],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value) {
                // Keuangan Kitchen tutup
                if ($role !== 'Keuangan Kitchen') {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Keuangan Kitchen yang berhak menyelesaikan pengajuan Alur A.'],
                    ]);
                }
            }
        }

        // Alur B (Unit)
        if ($alur === 'B') {
            if ($fromStatus === StatusPengajuan::DIAJUKAN->value) {
                // Koordinator unit pemohon saja
                if ($role !== 'Koordinator Unit') {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Koordinator unit yang berhak memverifikasi/menolak pengajuan ini.'],
                    ]);
                }
                // Validasi unit pemohon
                $userUnit = $user?->unit_id ?? $user?->getUnitSlugAlurB();
                $reqUnit = $req->unit_id;
                $unitPengajuan = strtoupper(trim(($req->unit_kerja ?? '') . ' ' . ($req->department ?? '')));

                $unitMatches = false;
                if (!empty($userUnit) && !empty($reqUnit)) {
                    $unitMatches = (strtoupper($userUnit) === strtoupper($reqUnit));
                } elseif (!empty($userUnit)) {
                    $unitMatches = str_contains($unitPengajuan, strtoupper($userUnit));
                    if (!$unitMatches && $user && $user->unit) {
                        $cleanUnitName = strtoupper(str_replace(['Biro Administrasi ', 'Sekretariat '], '', $user->unit->nama));
                        $unitMatches = str_contains($unitPengajuan, $cleanUnitName);
                    }
                }

                if (!$unitMatches) {
                    throw ValidationException::withMessages([
                        'role' => ["Hanya Koordinator dari unit terkait yang berhak memverifikasi pengajuan ini."],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::DITOLAK_KOORD->value) {
                // Staf revisi
                $isApplicant = ($req->pemohon_id && $user && $user->id == $req->pemohon_id) || ($user && $user->name === $req->applicant);
                if ($role !== 'Staf Unit' || !$isApplicant) {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Staf unit pemohon yang dapat merevisi dan mengajukan ulang.'],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::DIVERIFIKASI_KOORD->value) {
                // Keuangan Umum
                if ($role !== 'Keuangan Umum') {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Keuangan Umum yang berhak memproses belanja atau menolak pengajuan Alur B.'],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::SEDANG_DIBELANJAKAN->value) {
                // Staf konfirmasi penerimaan
                if ($role !== 'Staf Unit' || ($user && $user->name !== $req->applicant)) {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Staf unit pemohon yang dapat mengonfirmasi penerimaan barang.'],
                    ]);
                }
            } elseif ($fromStatus === StatusPengajuan::BARANG_DITERIMA->value) {
                // Keuangan Umum menyelesaikan
                if ($role !== 'Keuangan Umum') {
                    throw ValidationException::withMessages([
                        'role' => ['Hanya Keuangan Umum yang berhak menyelesaikan pengajuan Alur B.'],
                    ]);
                }
            }
        }
    }

    /**
     * Mengeksekusi transisi status dan mencatat riwayat ke status_log
     */
    public static function transition(
        ProcurementRequest $req,
        string $toStatus,
        ?User $user = null,
        ?string $catatan = null,
        ?string $actingRole = null,
        array $extraAttributes = []
    ): ProcurementRequest {
        self::validateTransition($req, $toStatus, $user, $catatan, $actingRole, isset($extraAttributes['faktor_f']));

        return DB::transaction(function () use ($req, $toStatus, $user, $catatan, $actingRole, $extraAttributes) {
            $fromStatus = $req->status;
            $alur = self::resolveWorkflow($req);

            // Update attributes pada request
            $req->status = $toStatus;
            if ($catatan) {
                $req->note = $catatan;
            }

            // Jika ditolak, simpan juga ke rejection_reason
            if (in_array($toStatus, [
                StatusPengajuan::DITOLAK_KOORD->value,
                StatusPengajuan::DITOLAK_KAPRODI->value,
                StatusPengajuan::DITOLAK_KEUANGAN->value,
            ])) {
                $req->rejection_reason = $catatan;
            }

            // Khusus Alur A saat DANA_DICAIRKAN: akumulasi carry-over tombok yang belum dibawa
            if ($alur === 'A' && $toStatus === StatusPengajuan::DANA_DICAIRKAN->value) {
                $baseAmount = (float)($extraAttributes['disbursed_amount'] ?? ($req->disbursed_amount > 0 ? $req->disbursed_amount : ($req->price ?? 0)));
                $req->disbursed_amount = $baseAmount;

                // Ambil semua carry_over milik Asdos yang sama dengan kasbon_tujuan_id masih NULL
                $pendingCarryOvers = \App\Models\KasbonPenyelesaian::where('jenis', 'carry_over')
                    ->whereNull('kasbon_tujuan_id')
                    ->whereHas('pengajuan', function ($q) use ($req) {
                        $q->where('applicant', $req->applicant)
                          ->where('id', '!=', $req->id);
                    })
                    ->get();

                $totalTombokBawaan = (float)$pendingCarryOvers->sum('nominal');
                $req->dana_diterima = $baseAmount + $totalTombokBawaan;

                // Tandai kasbon_tujuan_id agar hanya dibawa SATU kali (tidak terhitung ganda)
                foreach ($pendingCarryOvers as $co) {
                    $co->kasbon_tujuan_id = $req->id;
                    $co->save();
                }

                if ($totalTombokBawaan > 0) {
                    $kodeCarryOvers = $pendingCarryOvers->pluck('pengajuan_id')->implode(', ');
                    $catatan = ($catatan ? $catatan . ' ' : '') . "(+ Tombok dibawa dari {$kodeCarryOvers}: Rp " . number_format($totalTombokBawaan, 0, ',', '.') . ")";
                    $req->note = $catatan;
                }
            } elseif ($alur === 'B' && $toStatus === StatusPengajuan::SEDANG_DIBELANJAKAN->value) {
                $req->dana_diterima = (float)($extraAttributes['disbursed_amount'] ?? ($req->disbursed_amount > 0 ? $req->disbursed_amount : ($req->price ?? 0)));
            }

            foreach ($extraAttributes as $key => $val) {
                $req->{$key} = $val;
            }

            $req->save();

            // Simpan ke status_log (user_id nullable)
            StatusLog::create([
                'pengajuan_id' => $req->id,
                'dari' => $fromStatus,
                'ke' => $toStatus,
                'user_id' => $user?->id,
                'catatan' => $catatan ?? "Transisi status ke {$toStatus}",
                'created_at' => now(),
            ]);

            // Sinkronisasi dengan ProcurementActivityLog untuk audit trail visual frontend
            $actorName = $user?->name ?? ($actingRole ?? 'Sistem');
            $actorRole = $actingRole ?? ($user?->role ?? 'Sistem');

            ProcurementActivityLog::create([
                'procurement_request_id' => $req->id,
                'user_id' => $user?->id,
                'actor_name' => $actorName,
                'actor_role' => $actorRole,
                'action' => "Pembaruan Status: {$toStatus}",
                'status_from' => $fromStatus,
                'status_to' => $toStatus,
                'notes' => $catatan ?? "Status berhasil diubah ke {$toStatus}",
            ]);

            // Kirim notifikasi per user untuk transisi non-Sistem (transisi Sistem ditangani khusus oleh AutoKonfirmasiPenerimaan)
            if ($actorRole !== 'Sistem') {
                self::sendTransitionNotifications($req, $fromStatus, $toStatus, $catatan);
            }

            return $req;
        });
    }

    /**
     * Keputusan Bagian Keuangan dengan parameter faktor f ∈ {1, 0.5, 0.25, 0}
     */
    public static function processKeputusanKeuangan(
        ProcurementRequest $req,
        mixed $faktorF,
        ?string $catatanKeuangan,
        ?float $nominalTransfer = null,
        ?User $user = null,
        ?string $actingRole = null
    ): ProcurementRequest {
        if ($user === null && $actingRole === null) {
            throw ValidationException::withMessages([
                'user' => ['Pengguna wajib terautentikasi untuk membuat keputusan keuangan.'],
            ]);
        }

        $alur = self::resolveWorkflow($req);
        $role = $actingRole ?? $user?->role;

        // Super Admin TIDAK boleh memutuskan keuangan
        if ($role === 'Super Admin' || ($user && $user->isSuperAdmin())) {
            throw ValidationException::withMessages([
                'role' => ['Super Admin tidak berwenang memutuskan keuangan.'],
            ]);
        }

        if ($alur === 'A') {
            $isKeuKitchen = $role === 'Keuangan Kitchen' || ($role === 'Bagian Keuangan' && $user?->isKeuanganKitchen());
            if (!$isKeuKitchen) {
                throw ValidationException::withMessages([
                    'role' => ['Hanya Keuangan Kitchen yang berhak membuat keputusan Alur A.'],
                ]);
            }
        } else {
            $isKeuUmum = $role === 'Keuangan Umum' || ($role === 'Bagian Keuangan' && $user?->isKeuanganUmum());
            if (!$isKeuUmum) {
                throw ValidationException::withMessages([
                    'role' => ['Hanya Keuangan Umum yang berhak membuat keputusan Alur B.'],
                ]);
            }
        }

        // Cek status asal: Alur A harus DISETUJUI_KAPRODI, Alur B harus DIVERIFIKASI_KOORD
        if ($alur === 'A' && $req->status !== StatusPengajuan::DISETUJUI_KAPRODI->value) {
            throw ValidationException::withMessages([
                'status' => ["Pengajuan Alur A harus berstatus 'DISETUJUI_KAPRODI' untuk diproses Keuangan."],
            ]);
        }
        if ($alur === 'B' && $req->status !== StatusPengajuan::DIVERIFIKASI_KOORD->value) {
            throw ValidationException::withMessages([
                'status' => ["Pengajuan Alur B harus berstatus 'DIVERIFIKASI_KOORD' untuk diproses Keuangan."],
            ]);
        }

        // Validasi faktor f ∈ {1, 0.5, 0.25, 0}
        $validF = [1.0, 0.5, 0.25, 0.0];
        $fVal = is_numeric($faktorF) ? (float)$faktorF : -1.0;
        if (!in_array($fVal, $validF, true)) {
            throw ValidationException::withMessages([
                'faktor_f' => ['Nilai faktor f tidak valid. Pilihan yang sah hanya 1, 0.5, 0.25, atau 0.'],
            ]);
        }

        // Validasi catatan keuangan wajib diisi
        if (empty(trim($catatanKeuangan ?? ''))) {
            throw ValidationException::withMessages([
                'catatan_keuangan' => ['Catatan keuangan wajib diisi.'],
            ]);
        }

        // Validasi nominal transfer wajib diisi untuk f > 0
        if ($fVal > 0 && ($nominalTransfer === null || $nominalTransfer <= 0)) {
            throw ValidationException::withMessages([
                'nominal_transfer' => ['Nominal transfer wajib diisi untuk persetujuan (f > 0).'],
            ]);
        }

        // Hitung dan simpan qty_final per item
        $req->load('details');
        foreach ($req->details as $d) {
            $qtyFinal = CalculationService::calculateQtyFinal((float)$d->qty, $fVal, (string)$d->unit);
            $d->qty_final = $qtyFinal;
            $d->save();
        }

        // Tentukan status tujuan
        if ($fVal == 0.0) {
            $toStatus = StatusPengajuan::DITOLAK_KEUANGAN->value;
        } else {
            $toStatus = $alur === 'A'
                ? StatusPengajuan::DANA_DICAIRKAN->value
                : StatusPengajuan::SEDANG_DIBELANJAKAN->value;
        }

        $extraAttributes = [
            'faktor_f' => $fVal,
            'catatan_keuangan' => $catatanKeuangan,
            'nominal_transfer' => $fVal > 0 ? (float)$nominalTransfer : 0.0,
            'disbursed_amount' => $fVal > 0 ? (float)$nominalTransfer : 0.0,
        ];

        return self::transition($req, $toStatus, $user, $catatanKeuangan, $role, $extraAttributes);
    }

    /**
     * Cari akun user berdasarkan nama atau email pemohon
     */
    public static function findUserForApplicant(?string $applicantName): ?User
    {
        if (empty($applicantName)) {
            return null;
        }

        $user = User::where('name', $applicantName)->orWhere('email', $applicantName)->first();
        if ($user) {
            return $user;
        }

        $clean = trim(preg_replace('/\s*\(.*?\)\s*/', '', $applicantName));
        if (!empty($clean)) {
            $user = User::where('name', 'LIKE', "%{$clean}%")->first();
            if ($user) {
                return $user;
            }
        }

        $firstName = explode(' ', $clean)[0] ?? '';
        if (strlen($firstName) >= 3) {
            $user = User::where('name', 'LIKE', "%{$firstName}%")->first();
            if ($user) {
                return $user;
            }
        }

        return null;
    }

    /**
     * Ambil user Bagian Keuangan sesuai alur:
     * Alur A: Keuangan Kitchen (Praktikum & Kasbon)
     * Alur B: Keuangan Umum (ATK & Logistik)
     */
    public static function getKeuanganUsers(string $alur)
    {
        if ($alur === 'A') {
            $users = User::where('role', 'Keuangan Kitchen')
                ->orWhere(function ($q) {
                    $q->where('role', 'Bagian Keuangan')
                      ->where(function ($sub) {
                          $sub->where('department', 'LIKE', '%kitchen%')
                              ->orWhere('department', 'LIKE', '%praktikum%')
                              ->orWhere('department', 'LIKE', '%kasbon%')
                              ->orWhere('name', 'LIKE', '%kitchen%')
                              ->orWhere('email', 'keuangan.kitchen@gmail.com');
                      });
                })->get();
        } else {
            $users = User::where('role', 'Keuangan Umum')
                ->orWhere(function ($q) {
                    $q->where('role', 'Bagian Keuangan')
                      ->where(function ($sub) {
                          $sub->where('department', 'LIKE', '%umum%')
                              ->orWhere('name', 'LIKE', '%umum%')
                              ->orWhere('email', 'keuangan.umum@gmail.com');
                      });
                })->get();
        }

        return $users;
    }

    /**
     * Ambil Koordinator terkait:
     * Alur A: Koordinator Lab Kitchen
     * Alur B: Koordinator Unit pemohon saja
     */
    public static function getKoordinatorUsers(ProcurementRequest $req, string $alur)
    {
        if ($alur === 'A') {
            return User::whereIn('role', ['Koordinator Lab', 'Koordinator'])
                ->where(function ($q) {
                    $q->where('role', 'Koordinator Lab')
                      ->orWhere('department', 'LIKE', '%lab%')
                      ->orWhere('department', 'LIKE', '%kitchen%')
                      ->orWhere('name', 'LIKE', '%lab%');
                })->get();
        }

        $unitId = $req->unit_id;
        if (!empty($unitId)) {
            $users = User::whereIn('role', ['Koordinator Unit', 'Koordinator'])
                ->where('unit_id', $unitId)
                ->get();
            if ($users->isNotEmpty()) {
                return $users;
            }
        }

        $unit = strtolower(trim($req->unit_kerja ?? $req->department ?? ''));
        if (!empty($unit)) {
            $keywords = preg_split('/[\s,\(\)]+/', $unit, -1, PREG_SPLIT_NO_EMPTY);
            $query = User::whereIn('role', ['Koordinator Unit', 'Koordinator']);
            $query->where(function ($q) use ($keywords, $unit) {
                $q->whereRaw('LOWER(department) LIKE ?', ["%{$unit}%"]);
                foreach ($keywords as $kw) {
                    if (strlen($kw) >= 3) {
                        $q->orWhereRaw('LOWER(department) LIKE ?', ["%{$kw}%"])
                          ->orWhereRaw('LOWER(name) LIKE ?', ["%{$kw}%"]);
                    }
                }
            });
            $users = $query->get();
            if ($users->isNotEmpty()) {
                return $users;
            }
        }

        return User::whereIn('role', ['Koordinator Unit', 'Koordinator'])->get();
    }

    /**
     * Buat satu entri notifikasi per user
     */
    public static function createNotification(
        ?int $userId,
        string $title,
        string $desc,
        ?string $requestId = null,
        ?string $targetRole = null
    ): Notification {
        return Notification::create([
            'id' => sprintf('NOTIF-%s-%s', date('YmdHis'), Str::random(5)),
            'user_id' => $userId,
            'title' => $title,
            'desc' => $desc,
            'time' => 'Baru saja',
            'target_role' => $targetRole,
            'request_id' => $requestId,
            'read' => false,
        ]);
    }

    /**
     * Kirim notifikasi berbasis user untuk setiap transisi status
     */
    public static function sendTransitionNotifications(
        ProcurementRequest $req,
        ?string $fromStatus,
        string $toStatus,
        ?string $catatan = null
    ): void {
        $alur = self::resolveWorkflow($req);
        $pemohon = self::findUserForApplicant($req->applicant);

        if ($toStatus === StatusPengajuan::DIAJUKAN->value) {
            $koordinators = self::getKoordinatorUsers($req, $alur);
            foreach ($koordinators as $kUser) {
                self::createNotification(
                    userId: $kUser->id,
                    title: "Pengajuan {$req->id} Menunggu Verifikasi",
                    desc: "Pengajuan {$req->item} telah diajukan dan menunggu verifikasi Anda.",
                    requestId: $req->id
                );
            }
        } elseif ($toStatus === StatusPengajuan::DIVERIFIKASI_KOORD->value) {
            if ($alur === 'A') {
                $kaprodis = User::where('role', 'Kaprodi')->get();
                foreach ($kaprodis as $kp) {
                    self::createNotification(
                        userId: $kp->id,
                        title: "Pengajuan {$req->id} Menunggu Persetujuan",
                        desc: "Pengajuan {$req->item} telah diverifikasi Koordinator Lab dan menunggu persetujuan Kaprodi.",
                        requestId: $req->id
                    );
                }
            } else {
                foreach (self::getKeuanganUsers('B') as $ku) {
                    self::createNotification(
                        userId: $ku->id,
                        title: "Pengajuan Logistik {$req->id} Terverifikasi",
                        desc: "Pengajuan logistik {$req->item} telah diverifikasi Koordinator Unit dan siap dialokasikan belanja.",
                        requestId: $req->id
                    );
                }
            }
        } elseif ($toStatus === StatusPengajuan::DISETUJUI_KAPRODI->value) {
            foreach (self::getKeuanganUsers('A') as $ku) {
                self::createNotification(
                    userId: $ku->id,
                    title: "Pengajuan {$req->id} Disetujui Kaprodi",
                    desc: "Pengajuan {$req->item} disetujui Kaprodi. Menunggu pencairan kasbon ke Asdos.",
                    requestId: $req->id
                );
            }
        } elseif (in_array($toStatus, [
            StatusPengajuan::DITOLAK_KOORD->value,
            StatusPengajuan::DITOLAK_KAPRODI->value,
            StatusPengajuan::DITOLAK_KEUANGAN->value,
        ])) {
            if ($pemohon) {
                self::createNotification(
                    userId: $pemohon->id,
                    title: "Pengajuan {$req->id} Ditolak",
                    desc: "Pengajuan {$req->item} ditolak: " . ($req->rejection_reason ?? $catatan ?? 'Standar kebutuhan belum sesuai.'),
                    requestId: $req->id
                );
            }
        } elseif ($toStatus === StatusPengajuan::DANA_DICAIRKAN->value) {
            if ($pemohon) {
                self::createNotification(
                    userId: $pemohon->id,
                    title: "Dana Pengajuan {$req->id} Dicairkan",
                    desc: "Dana kasbon pengajuan {$req->item} telah dicairkan dan ditransfer ke rekening Anda. Silakan mulai berbelanja.",
                    requestId: $req->id
                );
            }
        } elseif ($toStatus === StatusPengajuan::SEDANG_DIBELANJAKAN->value) {
            if ($pemohon) {
                self::createNotification(
                    userId: $pemohon->id,
                    title: "Pengajuan {$req->id} Sedang Dibelanjakan",
                    desc: "Alokasi belanja logistik {$req->item} telah disetujui Keuangan Umum.",
                    requestId: $req->id
                );
            }
        } elseif ($toStatus === StatusPengajuan::BARANG_DITERIMA->value) {
            if ($alur === 'A') {
                if ($pemohon) {
                    self::createNotification(
                        userId: $pemohon->id,
                        title: "Barang Pengajuan {$req->id} Diterima",
                        desc: "Barang pengajuan {$req->item} telah diterima. Silakan unggah laporan belanja dan bon.",
                        requestId: $req->id
                    );
                }
            } else {
                foreach (self::getKeuanganUsers('B') as $ku) {
                    self::createNotification(
                        userId: $ku->id,
                        title: "Barang Pengajuan {$req->id} Diterima",
                        desc: "Barang pengadaan logistik {$req->item} telah sampai dan dikonfirmasi diterima unit kerja.",
                        requestId: $req->id
                    );
                }
            }
        } elseif ($toStatus === StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value) {
            foreach (self::getKeuanganUsers('A') as $ku) {
                self::createNotification(
                    userId: $ku->id,
                    title: "Laporan Belanja {$req->id} Diajukan",
                    desc: "Laporan belanja dan bon untuk {$req->item} telah diajukan oleh Asdos.",
                    requestId: $req->id
                );
            }
        } elseif ($toStatus === StatusPengajuan::SELESAI->value) {
            if ($pemohon) {
                self::createNotification(
                    userId: $pemohon->id,
                    title: "Pengajuan {$req->id} Selesai",
                    desc: "Pengajuan {$req->item} telah selesai diverifikasi dan transaksi resmi ditutup.",
                    requestId: $req->id
                );
            }
        }
    }
}
