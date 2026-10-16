<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Curriculum;
use Laravel\Sanctum\Sanctum;

class CurriculumNestedTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::firstOrCreate(
            ['email' => 'asdos.test@gmail.com'],
            [
                'id' => 'USR-TEST-001',
                'name' => 'Asdos Tester',
                'password' => bcrypt('123'),
                'role' => 'Asdos Kitchen',
                'department' => 'Laboratorium Kitchen',
                'status' => 'Aktif',
            ]
        );

        Curriculum::firstOrCreate(
            ['menu_name' => 'Nasi Goreng Spesial Test'],
            [
                'prodi' => 'D3 Perhotelan',
                'semester' => 1,
                'course' => 'Dasar Kuliner Indonesia',
                'ingredients' => [
                    ['name' => 'Beras Putih', 'gram_per_kelompok' => 500, 'unit' => 'gram', 'cost_per_unit' => 16],
                    ['name' => 'Telur Ayam', 'gram_per_kelompok' => 2, 'unit' => 'butir', 'cost_per_unit' => 2500],
                ],
            ]
        );
    }

    public function test_get_curriculums_unauthenticated_returns_401(): void
    {
        $response = $this->getJson('/api/curriculums');
        $response->assertStatus(401);
    }

    public function test_get_curriculums_returns_nested_tree_with_id_and_ingredients(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/curriculums');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'data' => [
                '*' => [
                    'prodiName',
                    'semesters' => [
                        '*' => [
                            'semester',
                            'courses' => [
                                '*' => [
                                    'courseName',
                                    'menus' => [
                                        '*' => [
                                            'id',
                                            'menuName',
                                            'ingredients',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertEquals('D3 Perhotelan', $data[0]['prodiName']);
        $this->assertNotEmpty($data[0]['semesters']);
        $this->assertEquals(1, $data[0]['semesters'][0]['semester']);
        $this->assertNotEmpty($data[0]['semesters'][0]['courses']);
        $this->assertEquals('Dasar Kuliner Indonesia', $data[0]['semesters'][0]['courses'][0]['courseName']);
        $this->assertNotEmpty($data[0]['semesters'][0]['courses'][0]['menus']);
        $menu = $data[0]['semesters'][0]['courses'][0]['menus'][0];
        $this->assertNotNull($menu['id']);
        $this->assertEquals('Nasi Goreng Spesial Test', $menu['menuName']);
        $this->assertCount(2, $menu['ingredients']);
    }

    public function test_get_curriculums_flat_format(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/curriculums?format=flat');
        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertEquals('D3 Perhotelan', $data[0]['prodi']);
        $this->assertEquals('Nasi Goreng Spesial Test', $data[0]['menu_name']);
    }
}
