<?php

namespace App\Services;

use App\Models\Curriculum;
use App\Models\LabStock;

class CalculationService
{
    /**
     * Daftar satuan utuh yang dibulatkan ke atas (ceil) saat dikalikan faktor f.
     */
    public const SATUAN_UTUH = [
        'butir', 'pcs', 'rim', 'botol', 'pack', 'batang',
        'lembar', 'set', 'ikat', 'kaleng', 'bungkus', 'ekor',
        'paket', 'sachet', 'blok', 'unit', 'dus', 'box',
    ];

    /**
     * Hitung kebutuhan bahan dan usulan belanja sesuai rumus UC-19 (Alur A):
     * kebutuhan = gram_per_kelompok (resep_item) × jml_kelompok
     * qty_usulan = max(0, kebutuhan − stok_chiller)
     *
     * @param float $gramPerKelompok Takaran per kelompok dari resep
     * @param int $jmlKelompok Jumlah kelompok praktikum
     * @param float $stokChiller Stok saat itu di cold storage / lab
     * @return array [kebutuhan, stok_saat_itu, qty_usulan]
     */
    public static function calculateUc19(float $gramPerKelompok, int $jmlKelompok, float $stokChiller): array
    {
        $kebutuhan = round($gramPerKelompok * max(1, $jmlKelompok), 2);
        $qtyUsulan = max(0.0, round($kebutuhan - max(0.0, $stokChiller), 2));

        return [
            'kebutuhan' => $kebutuhan,
            'stok_saat_itu' => max(0.0, $stokChiller),
            'qty_usulan' => $qtyUsulan,
        ];
    }

    /**
     * Hitung kuantitas final berdasarkan faktor f yang diputuskan Keuangan:
     * qty_final = qty × f
     * - Pembulatan ke atas (ceil) untuk satuan utuh
     * - 2 desimal untuk satuan berat / volume (gram, kg, liter, dll.)
     *
     * @param float $qty Kuantitas usulan
     * @param float $faktorF Faktor pengali (1, 0.5, 0.25, 0)
     * @param string $unit Satuan barang
     * @return float Kuantitas final
     */
    public static function calculateQtyFinal(float $qty, float $faktorF, string $unit): float
    {
        if ($faktorF <= 0) {
            return 0.0;
        }

        $raw = $qty * $faktorF;
        $unitClean = strtolower(trim($unit));

        if (in_array($unitClean, self::SATUAN_UTUH, true)) {
            return (float)ceil($raw);
        }

        return round($raw, 2);
    }

    /**
     * Proses kalkulasi otomatis seluruh bahan resep Alur A berdasarkan kurikulum.
     *
     * @param Curriculum $curriculum
     * @param int $jmlKelompok
     * @return array
     */
    public static function processCurriculumIngredients(Curriculum $curriculum, int $jmlKelompok): array
    {
        $ingredients = $curriculum->ingredients ?? [];
        $details = [];
        $totalPrice = 0.0;
        $totalQty = 0.0;
        $idx = 1;

        foreach ($ingredients as $ing) {
            $name = $ing['name'] ?? 'Bahan';
            $gramPerKelompok = (float)($ing['gram_per_kelompok'] ?? $ing['neededQty'] ?? $ing['needed_qty'] ?? $ing['qty'] ?? 1);

            $labStock = LabStock::where('name', $name)->first();
            $stokChiller = $labStock ? (float)$labStock->current_stock : 0.0;

            $calc = self::calculateUc19($gramPerKelompok, $jmlKelompok, $stokChiller);

            $pricePerUnit = (float)($labStock?->cost_per_unit ?? $ing['pricePerUnit'] ?? $ing['price'] ?? 0);
            $unit = $ing['unit'] ?? $labStock?->unit ?? 'kg';

            $subtotal = $calc['qty_usulan'] * $pricePerUnit;
            $totalPrice += $subtotal;
            $totalQty += $calc['qty_usulan'];

            $details[] = [
                'code_id' => 'D-' . sprintf('%02d', $idx++),
                'name' => $name,
                'qty' => $calc['qty_usulan'],
                'needed_qty' => $calc['kebutuhan'],
                'stock_in_lab' => $calc['stok_saat_itu'],
                'unit' => $unit,
                'price' => $pricePerUnit,
            ];
        }

        return [
            'details' => $details,
            'total_price' => $totalPrice,
            'total_qty' => $totalQty,
        ];
    }
}
