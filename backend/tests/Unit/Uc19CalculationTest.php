<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\CalculationService;

class Uc19CalculationTest extends TestCase
{
    /**
     * Test rumus UC-19 saat stok kurang:
     * kebutuhan = gram_per_kelompok x jml_kelompok
     * qty_usulan = max(0, kebutuhan - stok_chiller)
     */
    public function test_uc19_stok_kurang(): void
    {
        // 5 gram/kg per kelompok, 4 kelompok = 20 kebutuhan. Stok chiller 5 -> usulan 15
        $calc = CalculationService::calculateUc19(5.0, 4, 5.0);

        $this->assertEquals(20.0, $calc['kebutuhan']);
        $this->assertEquals(5.0, $calc['stok_saat_itu']);
        $this->assertEquals(15.0, $calc['qty_usulan']);
    }

    /**
     * Test rumus UC-19 saat stok chiller CUKUP (stok > kebutuhan):
     * qty_usulan harus 0
     */
    public function test_uc19_stok_chiller_cukup_sehingga_usulan_nol(): void
    {
        // 2 butir/kg per kelompok, 3 kelompok = 6 kebutuhan. Stok chiller 10 -> usulan 0
        $calc = CalculationService::calculateUc19(2.0, 3, 10.0);

        $this->assertEquals(6.0, $calc['kebutuhan']);
        $this->assertEquals(10.0, $calc['stok_saat_itu']);
        $this->assertEquals(0.0, $calc['qty_usulan']);
    }

    /**
     * Test rumus UC-19 saat stok chiller TEPAT SAMA dengan kebutuhan:
     * qty_usulan harus 0
     */
    public function test_uc19_stok_chiller_tepat_sama_dengan_kebutuhan(): void
    {
        $calc = CalculationService::calculateUc19(5.0, 2, 10.0);

        $this->assertEquals(10.0, $calc['kebutuhan']);
        $this->assertEquals(10.0, $calc['stok_saat_itu']);
        $this->assertEquals(0.0, $calc['qty_usulan']);
    }

    /**
     * Test rumus UC-19 saat stok chiller KOSONG (0):
     * qty_usulan = kebutuhan
     */
    public function test_uc19_stok_chiller_nol(): void
    {
        $calc = CalculationService::calculateUc19(4.0, 3, 0.0);

        $this->assertEquals(12.0, $calc['kebutuhan']);
        $this->assertEquals(0.0, $calc['stok_saat_itu']);
        $this->assertEquals(12.0, $calc['qty_usulan']);
    }

    /**
     * Test pembulatan qty_final faktor f untuk satuan utuh (ceil)
     */
    public function test_faktor_f_pembulatan_satuan_utuh(): void
    {
        // Satuan 'butir' (utuh): 5 x 0.5 = 2.5 -> ceil = 3
        $this->assertEquals(3.0, CalculationService::calculateQtyFinal(5.0, 0.5, 'butir'));

        // Satuan 'rim' (utuh): 3 x 0.25 = 0.75 -> ceil = 1
        $this->assertEquals(1.0, CalculationService::calculateQtyFinal(3.0, 0.25, 'rim'));

        // Satuan 'pack' (utuh): 7 x 0.5 = 3.5 -> ceil = 4
        $this->assertEquals(4.0, CalculationService::calculateQtyFinal(7.0, 0.5, 'pack'));

        // Satuan 'batang' (utuh): 1 x 0.25 = 0.25 -> ceil = 1
        $this->assertEquals(1.0, CalculationService::calculateQtyFinal(1.0, 0.25, 'batang'));

        // Faktor f = 1: utuh tetap sama
        $this->assertEquals(5.0, CalculationService::calculateQtyFinal(5.0, 1.0, 'butir'));

        // Faktor f = 0: 0
        $this->assertEquals(0.0, CalculationService::calculateQtyFinal(5.0, 0.0, 'butir'));
    }

    /**
     * Test pembulatan qty_final faktor f untuk satuan desimal (kg, liter, gram)
     */
    public function test_faktor_f_satuan_desimal(): void
    {
        // Satuan 'kg': 5 x 0.5 = 2.5
        $this->assertEquals(2.5, CalculationService::calculateQtyFinal(5.0, 0.5, 'kg'));

        // Satuan 'liter': 3 x 0.25 = 0.75
        $this->assertEquals(0.75, CalculationService::calculateQtyFinal(3.0, 0.25, 'liter'));

        // Satuan 'gram': 125 x 0.5 = 62.5
        $this->assertEquals(62.5, CalculationService::calculateQtyFinal(125.0, 0.5, 'gram'));

        // Faktor f = 0
        $this->assertEquals(0.0, CalculationService::calculateQtyFinal(10.0, 0.0, 'kg'));
    }
}
