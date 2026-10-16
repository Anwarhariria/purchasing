<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tambah kolom alur dan unit_kerja jika belum ada di tabel requests
        Schema::table('requests', function (Blueprint $table) {
            if (!Schema::hasColumn('requests', 'alur')) {
                $table->string('alur')->default('A')->after('id');
            }
            if (!Schema::hasColumn('requests', 'unit_kerja')) {
                $table->string('unit_kerja')->nullable()->after('purpose');
            }
        });

        // 2. Buat tabel status_log jika belum ada
        if (!Schema::hasTable('status_log')) {
            Schema::create('status_log', function (Blueprint $table) {
                $table->id();
                $table->string('pengajuan_id');
                $table->string('dari')->nullable();
                $table->string('ke');
                $table->unsignedBigInteger('user_id')->nullable();
                $table->text('catatan')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('pengajuan_id')->references('id')->on('requests')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            });
        }

        // 3. Ubah nilai status lama ke status baru 11 status FSM
        DB::table('requests')->where('status', 'Diajukan')->update(['status' => 'DIAJUKAN']);
        DB::table('requests')->where('status', 'Diverifikasi Koordinator')->update(['status' => 'DIVERIFIKASI_KOORD']);
        DB::table('requests')->where('status', 'Disetujui Kaprodi')->update(['status' => 'DISETUJUI_KAPRODI']);
        DB::table('requests')->where('status', 'Dana Dicairkan')->update(['status' => 'DANA_DICAIRKAN']);
        DB::table('requests')->where('status', 'Proses Pembelian')->update(['status' => 'SEDANG_DIBELANJAKAN']);
        DB::table('requests')->where('status', 'Barang Diterima')->update(['status' => 'BARANG_DITERIMA']);
        DB::table('requests')->where('status', 'Laporan Belanja Diajukan')->update(['status' => 'LAPORAN_BELANJA_DIAJUKAN']);
        DB::table('requests')->where('status', 'Selesai')->update(['status' => 'SELESAI']);

        // Pemetaan 'Ditolak' berdasarkan status_from di procurement_activity_logs (jika ada)
        $ditolakList = DB::table('requests')->where('status', 'Ditolak')->get();
        foreach ($ditolakList as $req) {
            $prevLog = DB::table('procurement_activity_logs')
                ->where('procurement_request_id', $req->id)
                ->where('status_to', 'Ditolak')
                ->latest()
                ->first();

            $targetStatus = 'DITOLAK_KOORD';
            if ($prevLog && $prevLog->status_from === 'Diverifikasi Koordinator') {
                $targetStatus = 'DITOLAK_KAPRODI';
            } elseif ($prevLog && $prevLog->status_from === 'Disetujui Kaprodi') {
                $targetStatus = 'DITOLAK_KEUANGAN';
            }

            DB::table('requests')->where('id', $req->id)->update(['status' => $targetStatus]);
        }
    }

    public function down(): void
    {
        // Revert status mapping jika rollback
        DB::table('requests')->where('status', 'DIAJUKAN')->update(['status' => 'Diajukan']);
        DB::table('requests')->where('status', 'DIVERIFIKASI_KOORD')->update(['status' => 'Diverifikasi Koordinator']);
        DB::table('requests')->where('status', 'DISETUJUI_KAPRODI')->update(['status' => 'Disetujui Kaprodi']);
        DB::table('requests')->where('status', 'DANA_DICAIRKAN')->update(['status' => 'Dana Dicairkan']);
        DB::table('requests')->where('status', 'SEDANG_DIBELANJAKAN')->update(['status' => 'Proses Pembelian']);
        DB::table('requests')->where('status', 'BARANG_DITERIMA')->update(['status' => 'Barang Diterima']);
        DB::table('requests')->where('status', 'LAPORAN_BELANJA_DIAJUKAN')->update(['status' => 'Laporan Belanja Diajukan']);
        DB::table('requests')->where('status', 'SELESAI')->update(['status' => 'Selesai']);
        DB::table('requests')->whereIn('status', ['DITOLAK_KOORD', 'DITOLAK_KAPRODI', 'DITOLAK_KEUANGAN'])->update(['status' => 'Ditolak']);

        Schema::dropIfExists('status_log');

        Schema::table('requests', function (Blueprint $table) {
            if (Schema::hasColumn('requests', 'unit_kerja')) {
                $table->dropColumn('unit_kerja');
            }
            if (Schema::hasColumn('requests', 'alur')) {
                $table->dropColumn('alur');
            }
        });
    }
};
