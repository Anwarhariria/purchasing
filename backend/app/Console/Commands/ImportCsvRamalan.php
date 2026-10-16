<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\Unit;
use App\Models\KatalogBarang;
use App\Enums\StatusPengajuan;
use Illuminate\Support\Facades\DB;

class ImportCsvRamalan extends Command
{
    protected $signature = 'ramalan:import-csv {file}';
    protected $description = 'Import riwayat pengadaan Alur B dari file CSV dengan validasi unit & katalog, sumber = import';

    public function handle(): int
    {
        $filePath = $this->argument('file');

        if (!file_exists($filePath)) {
            $this->error("File tidak ditemukan: {$filePath}");
            return 1;
        }

        $handle = fopen($filePath, 'r');
        if (!$handle) {
            $this->error("Gagal membuka file CSV: {$filePath}");
            return 1;
        }

        // Baca header
        $rawHeader = fgetcsv($handle);
        if (!$rawHeader) {
            $this->error("File CSV kosong.");
            fclose($handle);
            return 1;
        }

        $header = array_map(fn($h) => strtolower(trim($h)), $rawHeader);
        $expectedCols = ['periode', 'unit', 'barang', 'qty'];
        foreach ($expectedCols as $col) {
            if (!in_array($col, $header)) {
                $this->error("Header CSV tidak lengkap. Wajib mengandung kolom: periode, unit, barang, qty.");
                fclose($handle);
                return 1;
            }
        }

        $periodeIdx = array_search('periode', $header);
        $unitIdx = array_search('unit', $header);
        $barangIdx = array_search('barang', $header);
        $qtyIdx = array_search('qty', $header);

        $parsedRows = [];
        $rowNum = 1;

        // Baca dan validasi setiap baris
        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            if (empty(array_filter($row))) {
                continue; // baris kosong diabaikan
            }

            $periode = trim($row[$periodeIdx] ?? '');
            $unitInput = trim($row[$unitIdx] ?? '');
            $barangInput = trim($row[$barangIdx] ?? '');
            $qtyInput = trim($row[$qtyIdx] ?? '');

            // 1. Validasi periode: format YYYY-MM
            if (!preg_match('/^\d{4}-\d{2}$/', $periode)) {
                $this->error("Baris {$rowNum}: Format periode tidak valid ('{$periode}'). Gunakan format YYYY-MM.");
                fclose($handle);
                return 1;
            }

            // 2. Validasi unit: cek keberadaan di tabel units
            $unitObj = Unit::where('id', $unitInput)
                ->orWhere('kode', $unitInput)
                ->orWhere('nama', $unitInput)
                ->first();

            if (!$unitObj) {
                // Coba pencocokan substring nama resmi
                $unitObj = Unit::where('nama', 'like', "%{$unitInput}%")->first();
            }

            if (!$unitObj) {
                $this->error("Baris {$rowNum}: Unit '{$unitInput}' tidak valid atau tidak terdaftar di sistem.");
                fclose($handle);
                return 1;
            }

            // 3. Validasi barang: cek keberadaan di katalog_barang
            $barangObj = KatalogBarang::where('id', $barangInput)
                ->orWhere('kode', $barangInput)
                ->orWhere('nama', $barangInput)
                ->first();

            if (!$barangObj) {
                // Coba pencocokan substring nama barang
                $barangObj = KatalogBarang::where('nama', 'like', "%{$barangInput}%")->first();
            }

            if (!$barangObj) {
                $this->error("Baris {$rowNum}: Barang '{$barangInput}' tidak valid atau tidak ditemukan dalam katalog barang.");
                fclose($handle);
                return 1;
            }

            // 4. Validasi qty: numerik > 0
            if (!is_numeric($qtyInput) || (float)$qtyInput <= 0) {
                $this->error("Baris {$rowNum}: Qty ('{$qtyInput}') harus berupa angka positif.");
                fclose($handle);
                return 1;
            }

            $parsedRows[] = [
                'periode' => $periode,
                'unit' => $unitObj,
                'barang' => $barangObj,
                'qty' => (float)$qtyInput,
            ];
        }

        fclose($handle);

        if (empty($parsedRows)) {
            $this->warn("Tidak ada data valid yang dapat diimpor dari file CSV.");
            return 0;
        }

        // 5. Kelompokkan per (periode, unit_id) dan simpan sebagai ProcurementRequest dengan sumber = 'import'
        $grouped = [];
        foreach ($parsedRows as $r) {
            $key = $r['periode'] . '___' . $r['unit']->id;
            $grouped[$key][] = $r;
        }

        DB::beginTransaction();
        try {
            $requestCount = 0;
            $itemCount = 0;

            foreach ($grouped as $key => $items) {
                [$periode, $unitId] = explode('___', $key);
                $first = $items[0];
                $unit = $first['unit'];

                $reqId = sprintf('IMP-%s-%s-%s', str_replace('-', '', $periode), $unit->id, substr(uniqid(), -4));

                $totalQty = 0;
                $totalPrice = 0;

                $req = ProcurementRequest::create([
                    'id' => $reqId,
                    'item' => 'Pengadaan ATK & Logistik (Impor Historis)',
                    'category' => 'Pengadaan Barang & ATK Unit',
                    'unit_kerja' => $unit->nama,
                    'department' => $unit->nama,
                    'applicant' => 'Staf ' . $unit->nama . ' (Import)',
                    'date' => $periode . '-01',
                    'need_by' => $periode . '-05',
                    'purpose' => "Impor data historis pengadaan Alur B periode {$periode}",
                    'status' => StatusPengajuan::SELESAI->value,
                    'alur' => 'B',
                    'sumber' => 'import',
                    'academic_importance' => 'Standar',
                    'qty' => 0,
                    'price' => 0,
                    'unit' => 'item',
                ]);

                foreach ($items as $idx => $item) {
                    $katalog = $item['barang'];
                    $qty = $item['qty'];
                    $price = (float)$katalog->harga_acuan;

                    RequestDetail::create([
                        'request_id' => $req->id,
                        'code_id' => $katalog->id,
                        'name' => $katalog->nama,
                        'qty' => $qty,
                        'needed_qty' => $qty,
                        'unit' => $katalog->satuan,
                        'price' => $price,
                        'stock_in_lab' => 0,
                    ]);

                    $totalQty += $qty;
                    $totalPrice += ($qty * $price);
                    $itemCount++;
                }

                $req->update([
                    'qty' => $totalQty,
                    'price' => $totalPrice,
                ]);

                $requestCount++;
            }

            DB::commit();

            $this->info("Berhasil mengimpor {$itemCount} baris data historis ke dalam {$requestCount} pengajuan (sumber = 'import', alur = 'B').");
            return 0;

        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error("Terjadi kesalahan saat menyimpan data: " . $e->getMessage());
            return 1;
        }
    }
}
