<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\KasbonPenyelesaian;
use App\Models\Notification;
use App\Models\User;
use App\Services\WorkflowService;

class IngatkanCarryOverKasbon extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'kasbon:ingatkan-carry-over';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ingatkan Keuangan Kitchen tentang carry-over tombok kasbon yang belum diselesaikan lebih dari 14 hari.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Memeriksa carry-over tombok kasbon menggantung (> 14 hari)...');

        $cutoffDate = now()->subDays(14);

        // Cari carry_over dengan kasbon_tujuan_id NULL, diganti_langsung_at NULL, dan dibuat > 14 hari lalu
        $pendingCarryOvers = KasbonPenyelesaian::where('jenis', 'carry_over')
            ->whereNull('kasbon_tujuan_id')
            ->whereNull('diganti_langsung_at')
            ->where(function ($q) use ($cutoffDate) {
                $q->where('created_at', '<=', $cutoffDate)
                  ->orWhere('tanggal', '<=', $cutoffDate->toDateString());
            })
            ->with('pengajuan')
            ->get();

        if ($pendingCarryOvers->isEmpty()) {
            $this->info('Tidak ada carry-over tombok yang menggantung lebih dari 14 hari.');
            return Command::SUCCESS;
        }

        // Ambil semua user Keuangan Kitchen
        $keuanganKitchenUsers = User::all()->filter(fn(User $u) => $u->isKeuanganKitchen());

        if ($keuanganKitchenUsers->isEmpty()) {
            $this->warn('Tidak ditemukan user dengan peran Keuangan Kitchen.');
            return Command::SUCCESS;
        }

        $notifiedCount = 0;
        $todayDate = now()->toDateString();

        foreach ($pendingCarryOvers as $co) {
            $reqId = $co->pengajuan_id;
            $applicantName = $co->pengajuan?->applicant ?? 'Asdos';
            $nominalFormatted = 'Rp ' . number_format($co->nominal, 0, ',', '.');

            $title = "Pengingat Carry-Over Kasbon ({$reqId})";
            $desc = "Tombok kasbon sebesar {$nominalFormatted} milik {$applicantName} telah menggantung lebih dari 14 hari. Silakan bawa ke pencairan baru atau gunakan opsi Ganti Langsung.";

            foreach ($keuanganKitchenUsers as $user) {
                // Cegah notifikasi ganda untuk tombok yang sama di hari yang sama
                $alreadyNotifiedToday = Notification::where('user_id', $user->id)
                    ->where('request_id', $reqId)
                    ->whereDate('created_at', $todayDate)
                    ->where('title', 'like', 'Pengingat Carry-Over%')
                    ->exists();

                if ($alreadyNotifiedToday) {
                    continue;
                }

                WorkflowService::createNotification(
                    $user->id,
                    $title,
                    $desc,
                    $reqId,
                    'Keuangan Kitchen'
                );
                $notifiedCount++;
            }
        }

        $this->info("Berhasil mengirim {$notifiedCount} pengingat carry-over ke Keuangan Kitchen.");

        return Command::SUCCESS;
    }
}
