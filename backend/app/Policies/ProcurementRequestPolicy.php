<?php

namespace App\Policies;

use App\Models\User;
use App\Models\ProcurementRequest;
use App\Enums\StatusPengajuan;
use App\Services\WorkflowService;

class ProcurementRequestPolicy
{
    /**
     * Determine whether the user can view the procurement request.
     *
     * SRS Rules:
     * - Super Admin: semua (baca saja)
     * - Pemohon: hanya miliknya
     * - Koordinator Lab & Kaprodi & Keuangan Kitchen -> Alur A
     * - Koordinator Unit -> Alur B unitnya
     * - Keuangan Umum -> Alur B
     * - Lainnya -> false (403)
     */
    public function view(User $user, ProcurementRequest $req): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Pemohon berhak melihat miliknya sendiri (Alur A atau B)
        if (($req->pemohon_id && (string)$user->id === (string)$req->pemohon_id) ||
            (!$req->pemohon_id && $user->name === $req->applicant)) {
            return true;
        }

        $alur = WorkflowService::resolveWorkflow($req);

        if ($alur === 'A') {
            return $user->isKoordinatorLab() || $user->isKaprodi() || $user->isKeuanganKitchen();
        }

        if ($alur === 'B') {
            if ($user->isKeuanganUmum()) {
                return true;
            }

            if ($user->isKoordinatorUnit()) {
                return $this->matchesUnit($user, $req);
            }

            return false;
        }

        return false;
    }

    /**
     * Determine whether the user can update (edit/revisi) the procurement request.
     *
     * Rules:
     * (a) Koordinator Lab (Alur A) / Koordinator Unit pemohon (Alur B) saat status DIAJUKAN
     * (b) Kaprodi (Alur A) saat status DIVERIFIKASI_KOORD (B1)
     * (c) Koordinator Lab (Alur A) saat status DITOLAK_KAPRODI (evaluasi kuantitas)
     * (d) Pemohon merevisi pengajuannya sendiri saat status DITOLAK_KOORD atau DITOLAK_KAPRODI
     * Selain itu -> false (403)
     */
    public function update(User $user, ProcurementRequest $req): bool
    {
        $status = $req->status;
        $alur = WorkflowService::resolveWorkflow($req);

        // (a) Koordinator saat status DIAJUKAN
        if ($status === StatusPengajuan::DIAJUKAN->value) {
            if ($alur === 'A') {
                return $user->isKoordinatorLab();
            }
            if ($alur === 'B') {
                return $user->isKoordinatorUnit() && $this->matchesUnit($user, $req);
            }
            return false;
        }

        // Kaprodi saat status DIVERIFIKASI_KOORD (Alur A)
        if ($status === StatusPengajuan::DIVERIFIKASI_KOORD->value && $alur === 'A') {
            return $user->isKaprodi();
        }

        // Koordinator Lab saat status DITOLAK_KAPRODI (Alur A)
        if ($status === StatusPengajuan::DITOLAK_KAPRODI->value && $alur === 'A') {
            return $user->isKoordinatorLab();
        }

        // (b) Pemohon saat status DITOLAK_KOORD atau DITOLAK_KAPRODI
        if (in_array($status, [
            StatusPengajuan::DITOLAK_KOORD->value,
            StatusPengajuan::DITOLAK_KAPRODI->value,
        ], true)) {
            return ($req->pemohon_id && $user->id == $req->pemohon_id) || $user->name === $req->applicant;
        }

        return false;
    }

    /**
     * Determine whether the user can execute a specific status transition.
     * Enforces explicit matrix role x from_status x to_status.
     */
    public function transition(User $user, ProcurementRequest $req, string $toStatus): bool
    {
        $alur = WorkflowService::resolveWorkflow($req);
        $fromStatus = $req->status;

        if ($user->isSuperAdmin()) {
            return false;
        }

        if ($alur === 'A') {
            // Asdos Kitchen / Pemohon
            $isPemohonA = $user->isAsdosKitchen() || ($req->pemohon_id && $user->id == $req->pemohon_id) || $user->name === $req->applicant;
            if ($isPemohonA) {
                if ($fromStatus === StatusPengajuan::DITOLAK_KOORD->value && $toStatus === StatusPengajuan::DIAJUKAN->value) {
                    return true;
                }
                if ($fromStatus === StatusPengajuan::DANA_DICAIRKAN->value && $toStatus === StatusPengajuan::BARANG_DITERIMA->value) {
                    return true;
                }
                if ($fromStatus === StatusPengajuan::BARANG_DITERIMA->value && $toStatus === StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value) {
                    return true;
                }
            }

            // Koordinator Lab
            if ($user->isKoordinatorLab()) {
                if ($fromStatus === StatusPengajuan::DIAJUKAN->value && in_array($toStatus, [
                    StatusPengajuan::DIVERIFIKASI_KOORD->value,
                    StatusPengajuan::DITOLAK_KOORD->value,
                ], true)) {
                    return true;
                }
                if ($fromStatus === StatusPengajuan::DITOLAK_KAPRODI->value && in_array($toStatus, [
                    StatusPengajuan::DIAJUKAN->value,
                    StatusPengajuan::DIVERIFIKASI_KOORD->value,
                ], true)) {
                    return true;
                }
            }

            // Kaprodi
            if ($user->isKaprodi()) {
                if ($fromStatus === StatusPengajuan::DIVERIFIKASI_KOORD->value && in_array($toStatus, [
                    StatusPengajuan::DISETUJUI_KAPRODI->value,
                    StatusPengajuan::DITOLAK_KAPRODI->value,
                ], true)) {
                    return true;
                }
            }

            // Keuangan Kitchen
            if ($user->isKeuanganKitchen()) {
                if ($fromStatus === StatusPengajuan::DISETUJUI_KAPRODI->value && in_array($toStatus, [
                    StatusPengajuan::DANA_DICAIRKAN->value,
                    StatusPengajuan::DITOLAK_KEUANGAN->value,
                ], true)) {
                    return true;
                }
                if ($fromStatus === StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value && $toStatus === StatusPengajuan::SELESAI->value) {
                    return true;
                }
            }

            return false;
        }

        if ($alur === 'B') {
            // Staf Unit / Pemohon
            $isPemohonB = $user->isStafUnit() || ($req->pemohon_id && $user->id == $req->pemohon_id) || $user->name === $req->applicant;
            if ($isPemohonB) {
                if ($fromStatus === StatusPengajuan::DITOLAK_KOORD->value && $toStatus === StatusPengajuan::DIAJUKAN->value) {
                    return $this->matchesUnit($user, $req);
                }
                if ($fromStatus === StatusPengajuan::SEDANG_DIBELANJAKAN->value && $toStatus === StatusPengajuan::BARANG_DITERIMA->value) {
                    return $this->matchesUnit($user, $req);
                }
            }

            // Koordinator Unit
            if ($user->isKoordinatorUnit()) {
                if ($fromStatus === StatusPengajuan::DIAJUKAN->value && in_array($toStatus, [
                    StatusPengajuan::DIVERIFIKASI_KOORD->value,
                    StatusPengajuan::DITOLAK_KOORD->value,
                ], true)) {
                    return $this->matchesUnit($user, $req);
                }
            }

            // Keuangan Umum
            if ($user->isKeuanganUmum()) {
                if ($fromStatus === StatusPengajuan::DIVERIFIKASI_KOORD->value && in_array($toStatus, [
                    StatusPengajuan::SEDANG_DIBELANJAKAN->value,
                    StatusPengajuan::DITOLAK_KEUANGAN->value,
                ], true)) {
                    return true;
                }
                if ($fromStatus === StatusPengajuan::BARANG_DITERIMA->value && $toStatus === StatusPengajuan::SELESAI->value) {
                    return true;
                }
            }

            return false;
        }

        return false;
    }

    /**
     * Helper mencocokkan unit user dengan unit kerja pada pengajuan
     */
    protected function matchesUnit(User $user, ProcurementRequest $req): bool
    {
        $userUnit = $user->unit_id ?? $user->getUnitSlugAlurB();
        if (!$userUnit) {
            return false;
        }

        if (!empty($req->unit_id) && strtoupper($req->unit_id) === strtoupper($userUnit)) {
            return true;
        }

        $reqText = strtoupper(($req->unit_kerja ?? '') . ' ' . ($req->department ?? ''));
        return str_contains($reqText, strtoupper($userUnit));
    }
}
