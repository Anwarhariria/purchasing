<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ProcurementRequest;
use App\Models\StatusLog;
use App\Models\Notification;
use App\Enums\StatusPengajuan;
use App\Services\WorkflowService;
use Illuminate\Support\Str;

class AutoKonfirmasiPenerimaan extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pengajuan:auto-konfirmasi';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Konfirmasi otomatis penerimaan barang setelah 72 jam (3x24 jam) sejak dana dicairkan (Alur A) atau proses belanja (Alur B).';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Memulai pengecekan auto-konfirmasi penerimaan barang (3x24 jam)...');

        $eligibleStatuses = [
            StatusPengajuan::DANA_DICAIRKAN->value,
            StatusPengajuan::SEDANG_DIBELANJAKAN->value,
        ];

        $requests = ProcurementRequest::whereIn('status', $eligibleStatuses)->get();

        $processedCount = 0;
        $now = now();
        $threshold = $now->copy()->subHours(72);

        foreach ($requests as $req) {
            $alur = WorkflowService::resolveWorkflow($req);

            // Validasi alur sesuai status
            if ($alur === 'A' && $req->status !== StatusPengajuan::DANA_DICAIRKAN->value) {
                continue;
            }
            if ($alur === 'B' && $req->status !== StatusPengajuan::SEDANG_DIBELANJAKAN->value) {
                continue;
            }

            // Ambil entri status_log TERAKHIR yang masuk ke status saat ini
            $latestLog = StatusLog::where('pengajuan_id', $req->id)
                ->where('ke', $req->status)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->first();

            // Bila tidak ada status_log untuk status saat ini, LEWATI pengajuan itu (tanpa fallback updated_at)
            if (!$latestLog || !$latestLog->created_at) {
                continue;
            }

            $statusEntryTime = $latestLog->created_at;

            // Cek apakah sudah >= 72 jam
            if ($statusEntryTime->lte($threshold)) {
                $this->line("Memproses pengajuan: [{$req->id}] (Alur {$alur}) - Masuk status sejak {$statusEntryTime->toDateTimeString()}");

                // Transisi via WorkflowService sebagai Sistem
                WorkflowService::transition(
                    req: $req,
                    toStatus: StatusPengajuan::BARANG_DITERIMA->value,
                    user: null,
                    catatan: 'Konfirmasi otomatis oleh sistem setelah 72 jam (3x24 jam).',
                    actingRole: 'Sistem'
                );

                // Kirim notifikasi in-app
                $notifDesc = "Pengajuan {$req->id} dikonfirmasi otomatis sebagai diterima setelah 3×24 jam.";

                // 1. Notifikasi ke pemohon (user_id = pemohon pengajuan)
                $pemohonUser = WorkflowService::findUserForApplicant($req->applicant);
                WorkflowService::createNotification(
                    userId: $pemohonUser?->id,
                    title: 'Konfirmasi Penerimaan Otomatis (3×24 Jam)',
                    desc: $notifDesc,
                    requestId: $req->id
                );

                // 2. Notifikasi ke semua user Keuangan terkait (Kitchen untuk Alur A, Umum untuk Alur B)
                $keuanganUsers = WorkflowService::getKeuanganUsers($alur);
                foreach ($keuanganUsers as $kUser) {
                    WorkflowService::createNotification(
                        userId: $kUser->id,
                        title: 'Konfirmasi Penerimaan Otomatis (3×24 Jam)',
                        desc: $notifDesc,
                        requestId: $req->id
                    );
                }

                $processedCount++;
            }
        }

        $this->info("Selesai. Berhasil memproses {$processedCount} pengajuan auto-konfirmasi.");

        return Command::SUCCESS;
    }
}
