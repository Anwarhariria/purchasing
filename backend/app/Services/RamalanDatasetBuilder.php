<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class RamalanDatasetBuilder
{
    /**
     * Menyusun dataset riwayat pengadaan Alur B (simulasi + riil) untuk pelatihan dan prediksi AI.
     * SATU-SATUNYA penyusun dataset riwayat Alur B:
     * - periode = SUBSTRING(date,1,7) hanya bila date berformat YYYY-MM-..., selain itu DATE_FORMAT(created_at,'%Y-%m')
     * - unit_id = requests.unit_id (kode unit), fallback ke users.unit_id
     * - barang_id = KAT-xxx
     *
     * @return array<int, array{periode: string, unit_id: string, barang_id: string, qty: float}>
     */
    public static function build(): array
    {
        $details = DB::table('request_details')
            ->join('requests', 'request_details.request_id', '=', 'requests.id')
            ->leftJoin('users', 'requests.pemohon_id', '=', 'users.id')
            ->select(
                DB::raw("CASE 
                    WHEN requests.date REGEXP '^[0-9]{4}-[0-9]{2}' THEN SUBSTRING(requests.date, 1, 7)
                    ELSE DATE_FORMAT(requests.created_at, '%Y-%m')
                END as periode_sql"),
                'requests.date',
                'requests.created_at',
                'requests.unit_id as req_unit_id',
                'users.unit_id as user_unit_id',
                'request_details.code_id',
                'request_details.qty'
            )
            ->whereNotNull('request_details.code_id')
            ->where('request_details.code_id', 'like', '%KAT-%')
            ->whereNull('request_details.deleted_at')
            ->get();

        $dataset = [];

        foreach ($details as $d) {
            $p = (string)($d->periode_sql ?: '');
            // Validasi format YYYY-MM
            if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $p)) {
                $dateStr = (string)$d->date;
                if (preg_match('/^\d{4}-(0[1-9]|1[0-2])/', $dateStr)) {
                    $p = substr($dateStr, 0, 7);
                } elseif (!empty($d->created_at)) {
                    $p = date('Y-m', strtotime((string)$d->created_at));
                } else {
                    $p = now('Asia/Jakarta')->format('Y-m');
                }
            }

            // Ekstrak kode barang KAT-xxx
            $barangId = $d->code_id;
            if (preg_match('/KAT-\d+/', $d->code_id, $matches)) {
                $barangId = $matches[0];
            }

            // Unit selalu diambil dari requests.unit_id / users.unit_id
            $unitId = trim((string)($d->req_unit_id ?: $d->user_unit_id));
            if (empty($unitId)) {
                continue;
            }

            $dataset[] = [
                'periode' => $p,
                'unit_id' => $unitId,
                'barang_id' => $barangId,
                'qty' => (float)$d->qty,
            ];
        }

        return $dataset;
    }

    /**
     * Mengambil periode terakhir yang tercatat di dataset
     */
    public static function getLatestPeriod(array $dataset, string $default = '2026-09'): string
    {
        $latest = $default;
        foreach ($dataset as $row) {
            $p = $row['periode'] ?? '';
            if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $p) && $p > $latest) {
                $latest = $p;
            }
        }
        return $latest;
    }
}
