<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ProcurementRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;

class NeedByDateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_submitting_request_with_need_by_today_succeeds(): void
    {
        $asdos = User::where('role', 'Asdos Kitchen')->first();

        $today = now()->format('Y-m-d');

        $response = $this->actingAs($asdos)->postJson('/api/requests', [
            'alur' => 'A',
            'item' => 'Praktik Sarapan Pagi Hari Ini',
            'applicant' => $asdos->name,
            'category' => 'Bahan Praktik Masak',
            'prodi' => 'D3 Perhotelan',
            'semester' => 1,
            'course' => 'Dasar Masak Nusantara',
            'menu' => 'Nasi Goreng',
            'academic_importance' => 'Tinggi',
            'price' => 100000,
            'need_by' => $today,
            'purpose' => 'Kebutuhan mendesak hari ini',
            'details' => [
                [
                    'name' => 'Beras',
                    'qty' => 2,
                    'unit' => 'kg',
                    'price' => 15000,
                    'needed_qty' => 2,
                    'stock_in_lab' => 0,
                ],
            ],
        ]);

        $response->assertStatus(201);
        $requestId = $response->json('data.id');
        $this->assertNotNull($requestId);

        $req = ProcurementRequest::find($requestId);
        $this->assertEquals($today, $req->need_by);
    }

    public function test_submitting_request_with_need_by_yesterday_fails_with_validation_message(): void
    {
        $asdos = User::where('role', 'Asdos Kitchen')->first();

        $yesterday = now()->subDay()->format('Y-m-d');

        $response = $this->actingAs($asdos)->postJson('/api/requests', [
            'alur' => 'A',
            'item' => 'Praktik Bahan Kedaluwarsa',
            'applicant' => $asdos->name,
            'category' => 'Bahan Praktik Masak',
            'prodi' => 'D3 Perhotelan',
            'semester' => 1,
            'course' => 'Dasar Masak Nusantara',
            'menu' => 'Nasi Goreng',
            'academic_importance' => 'Tinggi',
            'price' => 100000,
            'need_by' => $yesterday,
            'purpose' => 'Tanggal kemarin',
            'details' => [
                [
                    'name' => 'Beras',
                    'qty' => 2,
                    'unit' => 'kg',
                    'price' => 15000,
                    'needed_qty' => 2,
                    'stock_in_lab' => 0,
                ],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'need_by' => 'Tanggal kebutuhan tidak boleh sebelum hari ini.',
        ]);
    }

    public function test_alur_b_request_with_need_by_today_succeeds_and_yesterday_fails(): void
    {
        $staf = User::where('role', 'Staf Unit')->first();

        $today = now()->format('Y-m-d');
        $yesterday = now()->subDay()->format('Y-m-d');

        // Today succeeds
        $resToday = $this->actingAs($staf)->postJson('/api/requests', [
            'alur' => 'B',
            'item' => 'ATK Hari Ini',
            'applicant' => $staf->name,
            'category' => 'Logistik & ATK Unit',
            'price' => 50000,
            'need_by' => $today,
            'purpose' => 'Kebutuhan ATK mendesak',
            'details' => [
                [
                    'name' => 'Kertas HVS A4 80gr PaperOne',
                    'qty' => 1,
                    'unit' => 'Rim',
                    'price' => 55000,
                    'needed_qty' => 1,
                    'stock_in_lab' => 0,
                ],
            ],
        ]);
        $resToday->assertStatus(201);

        // Yesterday fails
        $resYesterday = $this->actingAs($staf)->postJson('/api/requests', [
            'alur' => 'B',
            'item' => 'ATK Kemarin',
            'applicant' => $staf->name,
            'category' => 'Logistik & ATK Unit',
            'price' => 50000,
            'need_by' => $yesterday,
            'purpose' => 'Tanggal kemarin',
            'details' => [
                [
                    'name' => 'Kertas HVS A4 80gr PaperOne',
                    'qty' => 1,
                    'unit' => 'Rim',
                    'price' => 55000,
                    'needed_qty' => 1,
                    'stock_in_lab' => 0,
                ],
            ],
        ]);
        $resYesterday->assertStatus(422);
        $resYesterday->assertJsonValidationErrors([
            'need_by' => 'Tanggal kebutuhan tidak boleh sebelum hari ini.',
        ]);
    }
}
