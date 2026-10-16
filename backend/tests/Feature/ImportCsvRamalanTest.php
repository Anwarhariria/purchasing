<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Unit;
use App\Models\KatalogBarang;
use App\Models\ProcurementRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ImportCsvRamalanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed or update basic units and katalog
        Unit::updateOrCreate(['id' => 'PERPUS'], ['nama' => 'Perpustakaan', 'kode' => 'PERPUS']);
        Unit::updateOrCreate(['id' => 'PMB'], ['nama' => 'Penerimaan Mahasiswa Baru', 'kode' => 'PMB']);

        KatalogBarang::updateOrCreate(
            ['id' => 'KAT-001'],
            [
                'kode' => 'ATK-HVS-A4',
                'nama' => 'Kertas HVS A4 80gr PaperOne',
                'kategori' => 'Kertas & Dokumen',
                'satuan' => 'Rim',
                'harga_acuan' => 55000,
                'aktif' => true,
            ]
        );
        KatalogBarang::updateOrCreate(
            ['id' => 'KAT-007'],
            [
                'kode' => 'ATK-PUL-FASTER',
                'nama' => 'Pulpen Gel Faster C600 0.5 Hitam',
                'kategori' => 'Alat Tulis Kantor',
                'satuan' => 'Lusin',
                'harga_acuan' => 42000,
                'aktif' => true,
            ]
        );
    }

    public function test_import_valid_csv_creates_records_with_sumber_import()
    {
        $csvContent = "periode,unit,barang,qty\n"
            . "2026-08,PERPUS,KAT-001,15\n"
            . "2026-08,PERPUS,KAT-007,8\n"
            . "2026-08,PMB,KAT-001,20\n";

        $tempFile = tempnam(sys_get_temp_dir(), 'test_csv_') . '.csv';
        file_put_contents($tempFile, $csvContent);

        $code = $this->artisan('ramalan:import-csv', ['file' => $tempFile])->run();
        $this->assertEquals(0, $code);

        // Pastikan tersimpan dengan sumber = 'import' dan alur = 'B'
        $importedRequests = ProcurementRequest::where('sumber', 'import')->get();
        $this->assertCount(2, $importedRequests); // PERPUS dan PMB

        foreach ($importedRequests as $req) {
            $this->assertEquals('B', $req->alur);
            $this->assertEquals('SELESAI', $req->status);
            $this->assertEquals('import', $req->sumber);
        }

        if (file_exists($tempFile)) {
            unlink($tempFile);
        }
    }

    public function test_import_fails_when_file_not_found()
    {
        $exitCode = $this->artisan('ramalan:import-csv', ['file' => 'non_existent_file.csv']);
        $exitCode->assertExitCode(1);
    }

    public function test_import_fails_on_invalid_unit()
    {
        $csvContent = "periode,unit,barang,qty\n"
            . "2026-08,UNIT_TIDAK_DIKENAL,KAT-001,10\n";

        $tempFile = tempnam(sys_get_temp_dir(), 'test_csv_') . '.csv';
        file_put_contents($tempFile, $csvContent);

        $exitCode = $this->artisan('ramalan:import-csv', ['file' => $tempFile]);
        $exitCode->assertExitCode(1);

        if (file_exists($tempFile)) {
            unlink($tempFile);
        }
    }

    public function test_import_fails_on_invalid_barang()
    {
        $csvContent = "periode,unit,barang,qty\n"
            . "2026-08,PMB,BARANG_TIDAK_ADA,10\n";

        $tempFile = tempnam(sys_get_temp_dir(), 'test_csv_') . '.csv';
        file_put_contents($tempFile, $csvContent);

        $exitCode = $this->artisan('ramalan:import-csv', ['file' => $tempFile]);
        $exitCode->assertExitCode(1);

        if (file_exists($tempFile)) {
            unlink($tempFile);
        }
    }
}
