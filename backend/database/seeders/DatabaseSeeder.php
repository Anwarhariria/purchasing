<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\LabStock;
use App\Models\Curriculum;
use App\Models\Notification;
use App\Models\StatusLog;
use App\Enums\StatusPengajuan;
use App\Models\KasbonPenyelesaian;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 0. Seed Units (6 Unit Kerja Kampus SRS)
        $units = [
            ['id' => 'PMB', 'nama' => 'Penerimaan Mahasiswa Baru', 'kode' => 'PMB'],
            ['id' => 'PERPUS', 'nama' => 'Perpustakaan', 'kode' => 'PERPUS'],
            ['id' => 'SEKR-S1', 'nama' => 'Sekretariat S1 Terapan Perhotelan', 'kode' => 'SEKR-S1'],
            ['id' => 'SEKR-S2', 'nama' => 'Sekretariat S2 Terapan Pariwisata', 'kode' => 'SEKR-S2'],
            ['id' => 'SEKR-D3', 'nama' => 'Sekretariat D3 Perhotelan', 'kode' => 'SEKR-D3'],
            ['id' => 'LSP', 'nama' => 'Lembaga Sertifikasi Profesi', 'kode' => 'LSP'],
        ];
        foreach ($units as $u) {
            \App\Models\Unit::updateOrCreate(['id' => $u['id']], $u);
        }

        // 1. Seed Users (8 Peran Eksplisit SRS)
        $users = [
            // Alur A (Kitchen & Lab Perhotelan)
            [
                'code_id' => 'USR-001',
                'name' => 'Aura Maharani (Asdos Kitchen)',
                'email' => 'asdos@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Asdos Kitchen',
                'department' => 'Laboratorium Dapur & Restoran Perhotelan',
                'status' => 'Aktif',
            ],
            [
                'code_id' => 'USR-001-B',
                'name' => 'Siti Rahmawati (Asdos Kitchen)',
                'email' => 'asdos2@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Asdos Kitchen',
                'department' => 'Laboratorium Dapur & Restoran Perhotelan',
                'status' => 'Aktif',
            ],
            [
                'code_id' => 'USR-002',
                'name' => 'Chef Bagus Prasetyo (Koordinator Lab Kitchen)',
                'email' => 'koordinator@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Koordinator Lab',
                'department' => 'Laboratorium Terpadu Kitchen Perhotelan',
                'status' => 'Aktif',
            ],
            [
                'code_id' => 'USR-003',
                'name' => 'Dr. Maria Kusuma (Kaprodi Perhotelan)',
                'email' => 'kaprodi@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Kaprodi',
                'department' => 'Program Studi D3 Perhotelan',
                'status' => 'Aktif',
            ],
            [
                'code_id' => 'USR-004-KITCHEN',
                'name' => 'Ratna Sari (Keuangan Kitchen)',
                'email' => 'keuangan.kitchen@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Keuangan Kitchen',
                'department' => 'Keuangan Kitchen (Praktikum & Kasbon)',
                'status' => 'Aktif',
            ],

            // Alur B: 6 Unit Kerja Kampus (SRS)
            // Unit 1: PMB
            [
                'code_id' => 'USR-U2-STAF',
                'name' => 'Rizky Ananda (Staf PMB)',
                'email' => 'staf.pmb@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Staf Unit',
                'unit_id' => 'PMB',
                'department' => 'Penerimaan Mahasiswa Baru',
                'status' => 'Aktif',
            ],
            [
                'code_id' => 'USR-U2-KOORD',
                'name' => 'Budi Santoso (Koordinator PMB)',
                'email' => 'koord.pmb@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Koordinator Unit',
                'unit_id' => 'PMB',
                'department' => 'Penerimaan Mahasiswa Baru',
                'status' => 'Aktif',
            ],
            // Unit 2: Perpustakaan
            [
                'code_id' => 'USR-U3-STAF',
                'name' => 'Fajar Nugraha (Staf Perpustakaan)',
                'email' => 'staf.perpus@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Staf Unit',
                'unit_id' => 'PERPUS',
                'department' => 'Perpustakaan',
                'status' => 'Aktif',
            ],
            [
                'code_id' => 'USR-U3-KOORD',
                'name' => 'Dewi Lestari (Koordinator Perpustakaan)',
                'email' => 'koord.perpus@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Koordinator Unit',
                'unit_id' => 'PERPUS',
                'department' => 'Perpustakaan',
                'status' => 'Aktif',
            ],
            // Unit 3: Sekretariat S1
            [
                'code_id' => 'USR-U4-STAF',
                'name' => 'Rini Astuti (Staf Sekretariat S1)',
                'email' => 'staf.sekre.s1@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Staf Unit',
                'unit_id' => 'SEKR-S1',
                'department' => 'Sekretariat S1 Terapan Perhotelan',
                'status' => 'Aktif',
            ],
            [
                'code_id' => 'USR-U4-KOORD',
                'name' => 'Dr. Wahyu (Koordinator Sekretariat S1)',
                'email' => 'koord.sekre.s1@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Koordinator Unit',
                'unit_id' => 'SEKR-S1',
                'department' => 'Sekretariat S1 Terapan Perhotelan',
                'status' => 'Aktif',
            ],
            // Unit 4: Sekretariat S2
            [
                'code_id' => 'USR-U5-STAF',
                'name' => 'Irfan Hakim (Staf Sekretariat S2)',
                'email' => 'staf.sekre.s2@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Staf Unit',
                'unit_id' => 'SEKR-S2',
                'department' => 'Sekretariat S2 Terapan Pariwisata',
                'status' => 'Aktif',
            ],
            [
                'code_id' => 'USR-U5-KOORD',
                'name' => 'Dr. Suryo (Koordinator Sekretariat S2)',
                'email' => 'koord.sekre.s2@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Koordinator Unit',
                'unit_id' => 'SEKR-S2',
                'department' => 'Sekretariat S2 Terapan Pariwisata',
                'status' => 'Aktif',
            ],
            // Unit 5: Sekretariat D3
            [
                'code_id' => 'USR-U6-STAF',
                'name' => 'Siti Rahma (Staf Sekretariat D3)',
                'email' => 'staf.sekre@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Staf Unit',
                'unit_id' => 'SEKR-D3',
                'department' => 'Sekretariat D3 Perhotelan',
                'status' => 'Aktif',
            ],
            [
                'code_id' => 'USR-U6-KOORD',
                'name' => 'Dra. Endang (Koordinator Sekretariat D3)',
                'email' => 'koord.sekre@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Koordinator Unit',
                'unit_id' => 'SEKR-D3',
                'department' => 'Sekretariat D3 Perhotelan',
                'status' => 'Aktif',
            ],
            // Unit 6: LSP (Lembaga Sertifikasi Profesi)
            [
                'code_id' => 'USR-U7-STAF',
                'name' => 'Teguh Wibowo (Staf LSP)',
                'email' => 'staf.lsp@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Staf Unit',
                'unit_id' => 'LSP',
                'department' => 'Lembaga Sertifikasi Profesi',
                'status' => 'Aktif',
            ],
            [
                'code_id' => 'USR-U7-KOORD',
                'name' => 'Ir. Bambang (Koordinator LSP)',
                'email' => 'koord.lsp@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Koordinator Unit',
                'unit_id' => 'LSP',
                'department' => 'Lembaga Sertifikasi Profesi',
                'status' => 'Aktif',
            ],

            // Keuangan Umum & ATK (Alur B)
            [
                'code_id' => 'USR-004-UMUM',
                'name' => 'Bambang Sudiro (Keuangan Umum & ATK)',
                'email' => 'keuangan.umum@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Keuangan Umum',
                'department' => 'Keuangan Umum & Logistik',
                'status' => 'Aktif',
            ],

            // Super Admin
            [
                'code_id' => 'USR-005',
                'name' => 'Administrator Sistem (IT)',
                'email' => 'superadmin@gmail.com',
                'password' => Hash::make('123'),
                'role' => 'Super Admin',
                'department' => 'Pusat Teknologi Informasi',
                'status' => 'Aktif',
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(['email' => $userData['email']], $userData);
        }

        // 2. Seed Lab Stocks
        $stocks = [
            ['name' => 'Beras Putih Premium', 'stock' => 2, 'unit' => 'kg', 'cost' => 16000, 'category' => 'Bahan Kering'],
            ['name' => 'Santan Kelapa Kental', 'stock' => 1, 'unit' => 'liter', 'cost' => 25000, 'category' => 'Bahan Segar'],
            ['name' => 'Serai & Daun Pandan', 'stock' => 0, 'unit' => 'ikat', 'cost' => 8000, 'category' => 'Bahan Segar'],
            ['name' => 'Bawang Merah & Putih', 'stock' => 0.5, 'unit' => 'kg', 'cost' => 42000, 'category' => 'Bahan Segar'],
            ['name' => 'Telur Ayam Negeri', 'stock' => 10, 'unit' => 'butir', 'cost' => 2500, 'category' => 'Bahan Segar'],
            ['name' => 'Ayam Broiler Utuh', 'stock' => 0, 'unit' => 'ekor', 'cost' => 45000, 'category' => 'Bahan Segar'],
            ['name' => 'Minyak Goreng Sawit', 'stock' => 1, 'unit' => 'liter', 'cost' => 18000, 'category' => 'Bahan Kering'],
            ['name' => 'Tepung Terigu Protein Tinggi (Cakra)', 'stock' => 3, 'unit' => 'kg', 'cost' => 17000, 'category' => 'Bahan Kering'],
            ['name' => 'Butter Dry Sheet (Laminasi)', 'stock' => 0, 'unit' => 'kg', 'cost' => 150000, 'category' => 'Bahan Segar'],
            ['name' => 'Ragi Instan (Yeast)', 'stock' => 2, 'unit' => 'sachet', 'cost' => 12000, 'category' => 'Bahan Kering'],
            ['name' => 'Susu UHT Full Cream', 'stock' => 1, 'unit' => 'liter', 'cost' => 22000, 'category' => 'Bahan Segar'],
            ['name' => 'Gula Pasir Kristal', 'stock' => 2, 'unit' => 'kg', 'cost' => 18000, 'category' => 'Bahan Kering'],
            ['name' => 'Garam Halus', 'stock' => 2, 'unit' => 'bungkus', 'cost' => 5000, 'category' => 'Bahan Kering'],
            ['name' => 'Daging Sapi Gandik', 'stock' => 0, 'unit' => 'kg', 'cost' => 140000, 'category' => 'Bahan Segar'],
            ['name' => 'Santan Kental Murni', 'stock' => 2, 'unit' => 'liter', 'cost' => 25000, 'category' => 'Bahan Segar'],
            ['name' => 'Cabai Merah Keriting', 'stock' => 0, 'unit' => 'kg', 'cost' => 55000, 'category' => 'Bahan Segar'],
            ['name' => 'Lengkuas, Jahe & Serai', 'stock' => 0.5, 'unit' => 'kg', 'cost' => 28000, 'category' => 'Bahan Segar'],
            ['name' => 'Ayam Kampung', 'stock' => 0, 'unit' => 'ekor', 'cost' => 70000, 'category' => 'Bahan Segar'],
            ['name' => 'Soun Kering', 'stock' => 2, 'unit' => 'bungkus', 'cost' => 8000, 'category' => 'Bahan Kering'],
            ['name' => 'Tauge Segar', 'stock' => 0, 'unit' => 'kg', 'cost' => 15000, 'category' => 'Bahan Segar'],
            ['name' => 'Kol Segar', 'stock' => 0, 'unit' => 'kg', 'cost' => 12000, 'category' => 'Bahan Segar'],
            ['name' => 'Bumbu Soto & Rempah Basah', 'stock' => 0, 'unit' => 'paket', 'cost' => 35000, 'category' => 'Bahan Segar'],
            ['name' => 'Jeruk Nipis', 'stock' => 0.2, 'unit' => 'kg', 'cost' => 25000, 'category' => 'Bahan Segar'],
            ['name' => 'Tepung Terigu Protein Rendah (Kunci)', 'stock' => 1, 'unit' => 'kg', 'cost' => 15000, 'category' => 'Bahan Kering'],
            ['name' => 'Butter Elle & Vire', 'stock' => 0, 'unit' => 'kg', 'cost' => 120000, 'category' => 'Bahan Segar'],
            ['name' => 'Keju Cheddar Blok', 'stock' => 1, 'unit' => 'blok', 'cost' => 26000, 'category' => 'Bahan Segar'],
            ['name' => 'Susu Kental Manis', 'stock' => 1, 'unit' => 'kaleng', 'cost' => 14000, 'category' => 'Bahan Kering'],
            ['name' => 'Pasta Spaghetti La Fonte', 'stock' => 2, 'unit' => 'pack', 'cost' => 18000, 'category' => 'Bahan Kering'],
            ['name' => 'Cooking Cream', 'stock' => 1, 'unit' => 'liter', 'cost' => 70000, 'category' => 'Bahan Segar'],
            ['name' => 'Smoked Beef Slice', 'stock' => 1, 'unit' => 'pack', 'cost' => 35000, 'category' => 'Bahan Segar'],
            ['name' => 'Keju Parmesan Bubuk', 'stock' => 0, 'unit' => 'botol', 'cost' => 42000, 'category' => 'Bahan Segar'],
            ['name' => 'Baguette Bread', 'stock' => 0, 'unit' => 'batang', 'cost' => 16000, 'category' => 'Bahan Segar'],
            ['name' => 'Bawang Putih & Butter', 'stock' => 0, 'unit' => 'paket', 'cost' => 45000, 'category' => 'Bahan Segar'],
            ['name' => 'Daging Tenderloin Meltique/Wagyu', 'stock' => 0, 'unit' => 'kg', 'cost' => 260000, 'category' => 'Bahan Segar'],
            ['name' => 'Kentang Russet Import', 'stock' => 1, 'unit' => 'kg', 'cost' => 35000, 'category' => 'Bahan Segar'],
            ['name' => 'Heavy Cream Elle & Vire', 'stock' => 0, 'unit' => 'liter', 'cost' => 85000, 'category' => 'Bahan Segar'],
            ['name' => 'Truffle Oil Asli', 'stock' => 0, 'unit' => 'botol', 'cost' => 175000, 'category' => 'Bahan Segar'],
            ['name' => 'Asparagus Segar', 'stock' => 0, 'unit' => 'ikat', 'cost' => 45000, 'category' => 'Bahan Segar'],
        ];

        $stockIdx = 1;
        foreach ($stocks as $s) {
            LabStock::updateOrCreate(
                ['name' => $s['name']],
                [
                    'id' => sprintf('STK-%03d', $stockIdx++),
                    'category' => $s['category'],
                    'current_stock' => $s['stock'],
                    'unit' => $s['unit'],
                    'min_stock' => 2,
                    'cost_per_unit' => $s['cost'],
                    'location' => 'Gudang Bahan Kering & Cold Storage',
                    'last_restocked' => '2026-09-20',
                    'expiry_date' => '2026-12-31',
                ]
            );
        }

        // 3. Seed Curriculums
        $curriculums = [
            [
                'prodi' => 'D3 Perhotelan',
                'semester' => 1,
                'course' => 'Operasional Restoran & Sarapan Pagi',
                'menu_name' => 'American Breakfast & Omelette Komplit',
                'ingredients' => [
                    ['name' => 'Telur Ayam Negeri', 'neededQty' => 40, 'unit' => 'butir', 'pricePerUnit' => 2500],
                    ['name' => 'Smoked Beef Slice', 'neededQty' => 4, 'unit' => 'pack', 'pricePerUnit' => 35000],
                    ['name' => 'Baguette Bread', 'neededQty' => 5, 'unit' => 'batang', 'pricePerUnit' => 16000],
                    ['name' => 'Butter Elle & Vire', 'neededQty' => 1, 'unit' => 'kg', 'pricePerUnit' => 120000],
                ],
            ],
            [
                'prodi' => 'D3 Perhotelan',
                'semester' => 1,
                'course' => 'Dasar Pengolahan Makanan Nusantara',
                'menu_name' => 'Nasi Uduk Komplit & Lauk',
                'ingredients' => [
                    ['name' => 'Beras Putih Premium', 'neededQty' => 5, 'unit' => 'kg', 'pricePerUnit' => 16000],
                    ['name' => 'Santan Kelapa Kental', 'neededQty' => 4, 'unit' => 'liter', 'pricePerUnit' => 25000],
                    ['name' => 'Serai & Daun Pandan', 'neededQty' => 2, 'unit' => 'ikat', 'pricePerUnit' => 8000],
                    ['name' => 'Bawang Merah & Putih', 'neededQty' => 1, 'unit' => 'kg', 'pricePerUnit' => 42000],
                    ['name' => 'Telur Ayam Negeri', 'neededQty' => 30, 'unit' => 'butir', 'pricePerUnit' => 2500],
                    ['name' => 'Ayam Broiler Utuh', 'neededQty' => 3, 'unit' => 'ekor', 'pricePerUnit' => 45000],
                    ['name' => 'Minyak Goreng Sawit', 'neededQty' => 2, 'unit' => 'liter', 'pricePerUnit' => 18000],
                ],
            ],
            [
                'prodi' => 'D3 Perhotelan',
                'semester' => 1,
                'course' => 'Dasar Pengolahan Makanan Nusantara',
                'menu_name' => 'Soto Ayam Lamongan',
                'ingredients' => [
                    ['name' => 'Ayam Kampung', 'neededQty' => 2, 'unit' => 'ekor', 'pricePerUnit' => 70000],
                    ['name' => 'Soun Kering', 'neededQty' => 5, 'unit' => 'bungkus', 'pricePerUnit' => 8000],
                    ['name' => 'Tauge Segar', 'neededQty' => 1, 'unit' => 'kg', 'pricePerUnit' => 15000],
                    ['name' => 'Kol Segar', 'neededQty' => 1, 'unit' => 'kg', 'pricePerUnit' => 12000],
                    ['name' => 'Bumbu Soto & Rempah Basah', 'neededQty' => 1, 'unit' => 'paket', 'pricePerUnit' => 35000],
                    ['name' => 'Jeruk Nipis', 'neededQty' => 1, 'unit' => 'kg', 'pricePerUnit' => 25000],
                ],
            ],
            [
                'prodi' => 'D3 Perhotelan',
                'semester' => 2,
                'course' => 'Praktik Tata Hidang & Dapur Kontinental',
                'menu_name' => 'Pasta Carbonara & Garlic Bread',
                'ingredients' => [
                    ['name' => 'Pasta Spaghetti La Fonte', 'neededQty' => 6, 'unit' => 'pack', 'pricePerUnit' => 18000],
                    ['name' => 'Cooking Cream', 'neededQty' => 3, 'unit' => 'liter', 'pricePerUnit' => 70000],
                    ['name' => 'Smoked Beef Slice', 'neededQty' => 5, 'unit' => 'pack', 'pricePerUnit' => 35000],
                    ['name' => 'Keju Parmesan Bubuk', 'neededQty' => 3, 'unit' => 'botol', 'pricePerUnit' => 42000],
                    ['name' => 'Baguette Bread', 'neededQty' => 4, 'unit' => 'batang', 'pricePerUnit' => 16000],
                    ['name' => 'Bawang Putih & Butter', 'neededQty' => 1, 'unit' => 'paket', 'pricePerUnit' => 45000],
                ],
            ],
            [
                'prodi' => 'D3 Perhotelan',
                'semester' => 2,
                'course' => 'Pengolahan Bumbu & Rempah Dasar',
                'menu_name' => 'Rendang Daging Sapi Tradisional',
                'ingredients' => [
                    ['name' => 'Daging Sapi Gandik', 'neededQty' => 3, 'unit' => 'kg', 'pricePerUnit' => 140000],
                    ['name' => 'Santan Kental Murni', 'neededQty' => 6, 'unit' => 'liter', 'pricePerUnit' => 25000],
                    ['name' => 'Cabai Merah Keriting', 'neededQty' => 2, 'unit' => 'kg', 'pricePerUnit' => 55000],
                    ['name' => 'Bawang Merah & Putih', 'neededQty' => 2, 'unit' => 'kg', 'pricePerUnit' => 42000],
                    ['name' => 'Lengkuas, Jahe & Serai', 'neededQty' => 1, 'unit' => 'kg', 'pricePerUnit' => 28000],
                ],
            ],
            [
                'prodi' => 'D3 Perhotelan',
                'semester' => 3,
                'course' => 'Pastry & Bakery Perhotelan',
                'menu_name' => 'Croissant Butter & Danish Roll',
                'ingredients' => [
                    ['name' => 'Tepung Terigu Protein Tinggi (Cakra)', 'neededQty' => 8, 'unit' => 'kg', 'pricePerUnit' => 17000],
                    ['name' => 'Butter Dry Sheet (Laminasi)', 'neededQty' => 3, 'unit' => 'kg', 'pricePerUnit' => 150000],
                    ['name' => 'Ragi Instan (Yeast)', 'neededQty' => 4, 'unit' => 'sachet', 'pricePerUnit' => 12000],
                    ['name' => 'Susu UHT Full Cream', 'neededQty' => 4, 'unit' => 'liter', 'pricePerUnit' => 22000],
                    ['name' => 'Gula Pasir Kristal', 'neededQty' => 3, 'unit' => 'kg', 'pricePerUnit' => 18000],
                    ['name' => 'Garam Halus', 'neededQty' => 1, 'unit' => 'bungkus', 'pricePerUnit' => 5000],
                ],
            ],
            [
                'prodi' => 'D3 Perhotelan',
                'semester' => 3,
                'course' => 'Pastry & Bakery Perhotelan',
                'menu_name' => 'Bolu Gulung Keju Panggang',
                'ingredients' => [
                    ['name' => 'Telur Ayam Negeri', 'neededQty' => 30, 'unit' => 'butir', 'pricePerUnit' => 2500],
                    ['name' => 'Tepung Terigu Protein Rendah (Kunci)', 'neededQty' => 3, 'unit' => 'kg', 'pricePerUnit' => 15000],
                    ['name' => 'Butter Elle & Vire', 'neededQty' => 2, 'unit' => 'kg', 'pricePerUnit' => 120000],
                    ['name' => 'Keju Cheddar Blok', 'neededQty' => 4, 'unit' => 'blok', 'pricePerUnit' => 26000],
                    ['name' => 'Susu Kental Manis', 'neededQty' => 3, 'unit' => 'kaleng', 'pricePerUnit' => 14000],
                ],
            ],
            [
                'prodi' => 'D3 Perhotelan',
                'semester' => 5,
                'course' => 'Manajemen Restoran & Fine Dining',
                'menu_name' => 'Wagyu Tenderloin Steak & Truffle Mashed Potato',
                'ingredients' => [
                    ['name' => 'Daging Tenderloin Meltique/Wagyu', 'neededQty' => 4, 'unit' => 'kg', 'pricePerUnit' => 260000],
                    ['name' => 'Kentang Russet Import', 'neededQty' => 5, 'unit' => 'kg', 'pricePerUnit' => 35000],
                    ['name' => 'Heavy Cream Elle & Vire', 'neededQty' => 3, 'unit' => 'liter', 'pricePerUnit' => 85000],
                    ['name' => 'Truffle Oil Asli', 'neededQty' => 1, 'unit' => 'botol', 'pricePerUnit' => 175000],
                    ['name' => 'Asparagus Segar', 'neededQty' => 2, 'unit' => 'ikat', 'pricePerUnit' => 45000],
                ],
            ],
        ];

        foreach ($curriculums as $c) {
            Curriculum::updateOrCreate(
                [
                    'prodi' => $c['prodi'],
                    'semester' => $c['semester'],
                    'course' => $c['course'],
                    'menu_name' => $c['menu_name'],
                ],
                ['ingredients' => $c['ingredients']]
            );
        }

        // 4. Seed Katalog Barang (Alur B / UC-24)
        $katalog = [
            ['id' => 'KAT-001', 'kode' => 'ATK-HVS-A4', 'nama' => 'Kertas HVS A4 80gr PaperOne', 'kategori' => 'Kertas & Dokumen', 'satuan' => 'Rim', 'harga_acuan' => 55000, 'stok_tersedia' => 45, 'target_unit' => 'Seluruh Unit'],
            ['id' => 'KAT-002', 'kode' => 'ATK-HVS-F4', 'nama' => 'Kertas HVS F4/Folio 75gr Sinar Dunia', 'kategori' => 'Kertas & Dokumen', 'satuan' => 'Rim', 'harga_acuan' => 58000, 'stok_tersedia' => 30, 'target_unit' => 'PMB / Perpustakaan'],
            ['id' => 'KAT-003', 'kode' => 'TIN-CANON-790BK', 'nama' => 'Tinta Botol Canon GI-790 Black Original', 'kategori' => 'Tinta & Toner', 'satuan' => 'Botol', 'harga_acuan' => 125000, 'stok_tersedia' => 12, 'target_unit' => 'Seluruh Unit'],
            ['id' => 'KAT-004', 'kode' => 'TIN-EPSON-003BK', 'nama' => 'Tinta Botol Epson 003 Black Original', 'kategori' => 'Tinta & Toner', 'satuan' => 'Botol', 'harga_acuan' => 95000, 'stok_tersedia' => 16, 'target_unit' => 'Sekretariat Prodi'],
            ['id' => 'KAT-005', 'kode' => 'TON-HP-85A', 'nama' => 'Toner Cartridge HP LaserJet 85A (CE285A)', 'kategori' => 'Tinta & Toner', 'satuan' => 'Cartridge', 'harga_acuan' => 385000, 'stok_tersedia' => 6, 'target_unit' => 'Seluruh Unit'],
            ['id' => 'KAT-006', 'kode' => 'ATK-MAP-SNEL', 'nama' => 'Map Snelhechter Plastik Folio (Isi 50)', 'kategori' => 'Kertas & Dokumen', 'satuan' => 'Pack', 'harga_acuan' => 65000, 'stok_tersedia' => 20, 'target_unit' => 'PMB / Perpustakaan'],
            ['id' => 'KAT-007', 'kode' => 'ATK-PUL-FASTER', 'nama' => 'Pulpen Gel Faster C600 0.5 Hitam (Isi 12)', 'kategori' => 'Alat Tulis Kantor', 'satuan' => 'Lusin', 'harga_acuan' => 42000, 'stok_tersedia' => 35, 'target_unit' => 'Seluruh Unit'],
            ['id' => 'KAT-008', 'kode' => 'ATK-SPI-SNOWMAN', 'nama' => 'Spidol Whiteboard Snowman Hitam Boardmarker', 'kategori' => 'Alat Tulis Kantor', 'satuan' => 'Lusin', 'harga_acuan' => 98000, 'stok_tersedia' => 25, 'target_unit' => 'Seluruh Unit'],
            ['id' => 'KAT-009', 'kode' => 'ATK-STAPLER-HD10', 'nama' => 'Stapler Max HD-10 & Isi Staples No. 10', 'kategori' => 'Alat Tulis Kantor', 'satuan' => 'Set', 'harga_acuan' => 28000, 'stok_tersedia' => 18, 'target_unit' => 'Seluruh Unit'],
            ['id' => 'KAT-010', 'kode' => 'SAR-SABUN-500ML', 'nama' => 'Sabun Cuci Tangan Antiseptik Dettol 500ml', 'kategori' => 'Kebersihan & Sarpras', 'satuan' => 'Botol', 'harga_acuan' => 34000, 'stok_tersedia' => 40, 'target_unit' => 'Seluruh Gedung'],
            ['id' => 'KAT-011', 'kode' => 'SAR-TISU-ROLL', 'nama' => 'Tisu Gulung Toilet & Wastafel Paseo (Pack 10)', 'kategori' => 'Kebersihan & Sarpras', 'satuan' => 'Pack', 'harga_acuan' => 48000, 'stok_tersedia' => 22, 'target_unit' => 'Seluruh Gedung'],
            ['id' => 'KAT-012', 'kode' => 'SAR-LAKBAN-BENING', 'nama' => 'Lakban Bening Daimaru 2 Inch x 100 Yard', 'kategori' => 'Alat Tulis Kantor', 'satuan' => 'Roll', 'harga_acuan' => 16000, 'stok_tersedia' => 50, 'target_unit' => 'Seluruh Unit'],
        ];

        foreach ($katalog as $k) {
            \App\Models\KatalogBarang::updateOrCreate(
                ['id' => $k['id']],
                array_merge($k, ['aktif' => true])
            );
        }

        // 5. Seed Requests and Request Details
        $asdos1 = \App\Models\User::where('email', 'asdos@gmail.com')->first();
        $asdos2 = \App\Models\User::where('email', 'asdos2@gmail.com')->first();
        $stafPerpus = \App\Models\User::where('email', 'staf.perpus@gmail.com')->first();
        $stafSekreD3 = \App\Models\User::where('email', 'staf.sekre@gmail.com')->orWhere('email', 'staf.sekre.d3@gmail.com')->first();
        $stafPmb = \App\Models\User::where('email', 'staf.pmb@gmail.com')->first();

        $requests = [
            [
                'id' => 'PR-2026-001',
                'item' => 'Nasi Uduk Komplit & Lauk',
                'category' => 'Bahan Praktik Masak',
                'prodi' => 'D3 Perhotelan',
                'semester' => 1,
                'course' => 'Dasar Pengolahan Makanan Nusantara',
                'menu' => 'Nasi Uduk Komplit & Lauk',
                'qty' => 6,
                'unit' => 'items',
                'price' => 364000,
                'academic_importance' => 'Tinggi',
                'applicant' => $asdos1?->name ?? 'Aura Maharani (Asdos Kitchen)',
                'pemohon_id' => $asdos1 ? (string)$asdos1->id : null,
                'department' => 'Lab Perhotelan',
                'date' => '01 Okt 2026',
                'need_by' => '2026-10-05',
                'purpose' => 'Praktik memasak nasi uduk sesi sarapan pagi',
                'alur' => 'A',
                'status' => StatusPengajuan::DIAJUKAN->value,
                'details' => [
                    ['code_id' => 'D-01', 'name' => 'Beras Putih Premium', 'qty' => 3, 'unit' => 'kg', 'price' => 16000, 'needed_qty' => 5, 'stock_in_lab' => 2],
                    ['code_id' => 'D-02', 'name' => 'Santan Kelapa Kental', 'qty' => 3, 'unit' => 'liter', 'price' => 25000, 'needed_qty' => 4, 'stock_in_lab' => 1],
                    ['code_id' => 'D-03', 'name' => 'Serai & Daun Pandan', 'qty' => 2, 'unit' => 'ikat', 'price' => 8000, 'needed_qty' => 2, 'stock_in_lab' => 0],
                    ['code_id' => 'D-04', 'name' => 'Bawang Merah & Putih', 'qty' => 1, 'unit' => 'kg', 'price' => 42000, 'needed_qty' => 1, 'stock_in_lab' => 0.5],
                    ['code_id' => 'D-05', 'name' => 'Telur Ayam Negeri', 'qty' => 20, 'unit' => 'butir', 'price' => 2500, 'needed_qty' => 30, 'stock_in_lab' => 10],
                    ['code_id' => 'D-06', 'name' => 'Ayam Broiler Utuh', 'qty' => 3, 'unit' => 'ekor', 'price' => 45000, 'needed_qty' => 3, 'stock_in_lab' => 0],
                ],
            ],
            [
                'id' => 'PR-2026-002',
                'item' => 'Croissant Butter & Danish Roll',
                'category' => 'Bahan Praktik Masak',
                'prodi' => 'D3 Perhotelan',
                'semester' => 3,
                'course' => 'Pastry & Bakery Perhotelan',
                'menu' => 'Croissant Butter & Danish Roll',
                'qty' => 4,
                'unit' => 'items',
                'price' => 625000,
                'academic_importance' => 'Tinggi',
                'applicant' => $asdos1?->name ?? 'Aura Maharani (Asdos Kitchen)',
                'pemohon_id' => $asdos1 ? (string)$asdos1->id : null,
                'department' => 'Lab Perhotelan',
                'date' => '29 Sep 2026',
                'need_by' => '2026-10-04',
                'purpose' => 'Ujian tengah semester praktik pastry laminasi',
                'alur' => 'A',
                'status' => StatusPengajuan::DIVERIFIKASI_KOORD->value,
                'note' => 'Standar porsi resep telah divalidasi Koordinator Lab.',
                'details' => [
                    ['code_id' => 'D-07', 'name' => 'Tepung Terigu Protein Tinggi (Cakra)', 'qty' => 5, 'unit' => 'kg', 'price' => 17000, 'needed_qty' => 8, 'stock_in_lab' => 3],
                    ['code_id' => 'D-08', 'name' => 'Butter Dry Sheet (Laminasi)', 'qty' => 3, 'unit' => 'kg', 'price' => 150000, 'needed_qty' => 3, 'stock_in_lab' => 0],
                    ['code_id' => 'D-09', 'name' => 'Ragi Instan (Yeast)', 'qty' => 2, 'unit' => 'sachet', 'price' => 12000, 'needed_qty' => 4, 'stock_in_lab' => 2],
                    ['code_id' => 'D-10', 'name' => 'Susu UHT Full Cream', 'qty' => 3, 'unit' => 'liter', 'price' => 22000, 'needed_qty' => 4, 'stock_in_lab' => 1],
                ],
            ],
            [
                'id' => 'PR-2026-003',
                'item' => 'Rendang Daging Sapi Tradisional',
                'category' => 'Bahan Praktik Masak',
                'prodi' => 'D3 Perhotelan',
                'semester' => 2,
                'course' => 'Pengolahan Bumbu & Rempah Dasar',
                'menu' => 'Rendang Daging Sapi Tradisional',
                'qty' => 4,
                'unit' => 'items',
                'price' => 654000,
                'academic_importance' => 'Tinggi',
                'applicant' => $asdos2?->name ?? 'Siti Rahmawati (Asdos Kitchen)',
                'pemohon_id' => $asdos2 ? (string)$asdos2->id : null,
                'department' => 'Lab Perhotelan',
                'date' => '28 Sep 2026',
                'need_by' => '2026-10-06',
                'purpose' => 'Praktik pengolahan bumbu dasar karamelisasi rendang',
                'alur' => 'A',
                'status' => StatusPengajuan::DISETUJUI_KAPRODI->value,
                'note' => 'Disetujui Kaprodi. Siap dicairkan oleh Keuangan ke Asdos.',
                'details' => [
                    ['code_id' => 'D-11', 'name' => 'Daging Sapi Gandik', 'qty' => 3, 'unit' => 'kg', 'price' => 140000, 'needed_qty' => 3, 'stock_in_lab' => 0],
                    ['code_id' => 'D-12', 'name' => 'Santan Kental Murni', 'qty' => 4, 'unit' => 'liter', 'price' => 25000, 'needed_qty' => 6, 'stock_in_lab' => 2],
                    ['code_id' => 'D-13', 'name' => 'Cabai Merah Keriting', 'qty' => 2, 'unit' => 'kg', 'price' => 55000, 'needed_qty' => 2, 'stock_in_lab' => 0],
                    ['code_id' => 'D-14', 'name' => 'Lengkuas, Jahe & Serai', 'qty' => 1, 'unit' => 'kg', 'price' => 24000, 'needed_qty' => 1, 'stock_in_lab' => 0.5],
                ],
            ],
            [
                'id' => 'PR-2026-004',
                'item' => 'Pasta Carbonara & Garlic Bread',
                'category' => 'Bahan Praktik Masak',
                'prodi' => 'D3 Perhotelan',
                'semester' => 2,
                'course' => 'Praktik Tata Hidang & Dapur Kontinental',
                'menu' => 'Pasta Carbonara & Garlic Bread',
                'qty' => 5,
                'unit' => 'items',
                'price' => 492000,
                'academic_importance' => 'Tinggi',
                'applicant' => $asdos2?->name ?? 'Siti Rahmawati (Asdos Kitchen)',
                'pemohon_id' => $asdos2 ? (string)$asdos2->id : null,
                'department' => 'Lab Perhotelan',
                'date' => '25 Sep 2026',
                'need_by' => '2026-10-02',
                'purpose' => 'Praktik restoran masakan kontinental',
                'alur' => 'A',
                'status' => StatusPengajuan::DANA_DICAIRKAN->value,
                'disbursed_amount' => 500000,
                'dana_diterima' => 500000,
                'note' => 'Dana sebesar Rp 500.000 telah ditransfer ke Siti Rahmawati (Rekening Bank Asdos).',
                'details' => [
                    ['code_id' => 'D-15', 'name' => 'Pasta Spaghetti La Fonte', 'qty' => 4, 'unit' => 'pack', 'price' => 18000, 'needed_qty' => 6, 'stock_in_lab' => 2],
                    ['code_id' => 'D-16', 'name' => 'Cooking Cream', 'qty' => 2, 'unit' => 'liter', 'price' => 70000, 'needed_qty' => 3, 'stock_in_lab' => 1],
                    ['code_id' => 'D-17', 'name' => 'Smoked Beef Slice', 'qty' => 4, 'unit' => 'pack', 'price' => 35000, 'needed_qty' => 5, 'stock_in_lab' => 1],
                    ['code_id' => 'D-18', 'name' => 'Keju Parmesan Bubuk', 'qty' => 3, 'unit' => 'botol', 'price' => 42000, 'needed_qty' => 3, 'stock_in_lab' => 0],
                    ['code_id' => 'D-19', 'name' => 'Baguette Bread', 'qty' => 4, 'unit' => 'batang', 'price' => 16000, 'needed_qty' => 4, 'stock_in_lab' => 0],
                ],
            ],
            [
                'id' => 'PR-2026-005',
                'item' => 'Bolu Gulung Keju Panggang',
                'category' => 'Bahan Praktik Masak',
                'prodi' => 'D3 Perhotelan',
                'semester' => 3,
                'course' => 'Pastry & Bakery Perhotelan',
                'menu' => 'Bolu Gulung Keju Panggang',
                'qty' => 4,
                'unit' => 'items',
                'price' => 405000,
                'academic_importance' => 'Sedang',
                'applicant' => $asdos2?->name ?? 'Siti Rahmawati (Asdos Kitchen)',
                'pemohon_id' => $asdos2 ? (string)$asdos2->id : null,
                'department' => 'Lab Perhotelan',
                'date' => '24 Sep 2026',
                'need_by' => '2026-09-28',
                'purpose' => 'Praktik bolu gulung keju',
                'alur' => 'A',
                'status' => StatusPengajuan::BARANG_DITERIMA->value,
                'disbursed_amount' => 420000,
                'dana_diterima' => 420000,
                'note' => 'Bahan telah diterima oleh Asdos, siap mengunggah bon belanja.',
                'details' => [
                    ['code_id' => 'D-20', 'name' => 'Telur Ayam Negeri', 'qty' => 20, 'unit' => 'butir', 'price' => 2500, 'needed_qty' => 30, 'stock_in_lab' => 10],
                    ['code_id' => 'D-21', 'name' => 'Butter Elle & Vire', 'qty' => 2, 'unit' => 'kg', 'price' => 120000, 'needed_qty' => 2, 'stock_in_lab' => 0],
                    ['code_id' => 'D-22', 'name' => 'Keju Cheddar Blok', 'qty' => 3, 'unit' => 'blok', 'price' => 26000, 'needed_qty' => 4, 'stock_in_lab' => 1],
                    ['code_id' => 'D-23', 'name' => 'Susu Kental Manis', 'qty' => 2, 'unit' => 'kaleng', 'price' => 14000, 'needed_qty' => 3, 'stock_in_lab' => 1],
                ],
            ],
            [
                'id' => 'PR-2026-006',
                'item' => 'Soto Ayam Lamongan',
                'category' => 'Bahan Praktik Masak',
                'prodi' => 'D3 Perhotelan',
                'semester' => 1,
                'course' => 'Dasar Pengolahan Makanan Nusantara',
                'menu' => 'Soto Ayam Lamongan',
                'qty' => 5,
                'unit' => 'items',
                'price' => 246000,
                'academic_importance' => 'Tinggi',
                'applicant' => $asdos1?->name ?? 'Aura Maharani (Asdos Kitchen)',
                'pemohon_id' => $asdos1 ? (string)$asdos1->id : null,
                'department' => 'Lab Perhotelan',
                'date' => '20 Sep 2026',
                'need_by' => '2026-09-25',
                'purpose' => 'Praktik soto ayam',
                'alur' => 'A',
                'status' => StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value,
                'disbursed_amount' => 260000,
                'dana_diterima' => 260000,
                'actual_spent' => 245000,
                'refund_amount' => 15000,
                'deficit_amount' => 0,
                'note' => 'Asdos melampirkan bon belanja. Sisa uang kembalian Rp 15.000 disimpan di kas Asdos.',
                'details' => [
                    ['code_id' => 'D-24', 'name' => 'Ayam Kampung', 'qty' => 2, 'unit' => 'ekor', 'price' => 70000, 'needed_qty' => 2, 'stock_in_lab' => 0],
                    ['code_id' => 'D-25', 'name' => 'Soun Kering', 'qty' => 3, 'unit' => 'bungkus', 'price' => 8000, 'needed_qty' => 5, 'stock_in_lab' => 2],
                    ['code_id' => 'D-26', 'name' => 'Tauge Segar', 'qty' => 1, 'unit' => 'kg', 'price' => 15000, 'needed_qty' => 1, 'stock_in_lab' => 0],
                    ['code_id' => 'D-27', 'name' => 'Kol Segar', 'qty' => 1, 'unit' => 'kg', 'price' => 12000, 'needed_qty' => 1, 'stock_in_lab' => 0],
                    ['code_id' => 'D-28', 'name' => 'Bumbu Soto & Rempah Basah', 'qty' => 1, 'unit' => 'paket', 'price' => 35000, 'needed_qty' => 1, 'stock_in_lab' => 0],
                ],
            ],
            [
                'id' => 'PR-2026-007',
                'item' => 'Wagyu Tenderloin Steak & Truffle Mashed Potato',
                'category' => 'Bahan Praktik Masak',
                'prodi' => 'D3 Perhotelan',
                'semester' => 5,
                'course' => 'Manajemen Restoran & Fine Dining',
                'menu' => 'Wagyu Tenderloin Steak & Truffle Mashed Potato',
                'qty' => 5,
                'unit' => 'items',
                'price' => 1650000,
                'academic_importance' => 'Tinggi',
                'applicant' => $asdos2?->name ?? 'Siti Rahmawati (Asdos Kitchen)',
                'pemohon_id' => $asdos2 ? (string)$asdos2->id : null,
                'department' => 'Lab Perhotelan',
                'date' => '15 Sep 2026',
                'need_by' => '2026-09-20',
                'purpose' => 'Ujian fine dining semester 5',
                'alur' => 'A',
                'status' => StatusPengajuan::SELESAI->value,
                'disbursed_amount' => 1600000,
                'dana_diterima' => 1600000,
                'actual_spent' => 1650000,
                'refund_amount' => 0,
                'deficit_amount' => 50000,
                'note' => 'Kekurangan dana Rp 50.000 dicatat sebagai carry-over ke kasbon berikutnya. Transaksi resmi ditutup.',
                'details' => [
                    ['code_id' => 'D-29', 'name' => 'Daging Tenderloin Meltique/Wagyu', 'qty' => 4, 'unit' => 'kg', 'price' => 260000, 'needed_qty' => 4, 'stock_in_lab' => 0],
                    ['code_id' => 'D-30', 'name' => 'Kentang Russet Import', 'qty' => 4, 'unit' => 'kg', 'price' => 35000, 'needed_qty' => 5, 'stock_in_lab' => 1],
                    ['code_id' => 'D-31', 'name' => 'Heavy Cream Elle & Vire', 'qty' => 3, 'unit' => 'liter', 'price' => 85000, 'needed_qty' => 3, 'stock_in_lab' => 0],
                    ['code_id' => 'D-32', 'name' => 'Truffle Oil Asli', 'qty' => 1, 'unit' => 'botol', 'price' => 175000, 'needed_qty' => 1, 'stock_in_lab' => 0],
                    ['code_id' => 'D-33', 'name' => 'Asparagus Segar', 'qty' => 2, 'unit' => 'ikat', 'price' => 45000, 'needed_qty' => 2, 'stock_in_lab' => 0],
                ],
            ],
            [
                'id' => 'PR-2026-008',
                'item' => 'Pengadaan Kertas HVS & ATK Perpustakaan',
                'category' => 'Pengadaan Barang & ATK Unit',
                'unit_id' => 'PERPUS',
                'unit_kerja' => 'Perpustakaan',
                'department' => 'Perpustakaan',
                'qty' => 10,
                'unit' => 'rim',
                'price' => 550000,
                'academic_importance' => 'Standar',
                'applicant' => $stafPerpus?->name ?? 'Fajar Nugraha (Staf Perpustakaan)',
                'pemohon_id' => $stafPerpus ? (string)$stafPerpus->id : null,
                'date' => '02 Okt 2026',
                'need_by' => '2026-10-07',
                'purpose' => 'Kebutuhan administrasi layanan sirkulasi dan keanggotaan perpustakaan',
                'alur' => 'B',
                'status' => StatusPengajuan::SEDANG_DIBELANJAKAN->value,
                'disbursed_amount' => 550000,
                'note' => 'Disetujui Keuangan Umum, barang sedang dibelanjakan oleh petugas pembelanja.',
                'details' => [
                    ['code_id' => 'KAT-001', 'name' => 'Kertas HVS A4 80gr PaperOne', 'qty' => 10, 'unit' => 'Rim', 'price' => 55000, 'needed_qty' => 10, 'stock_in_lab' => 0],
                ],
            ],
            [
                'id' => 'PR-2026-009',
                'item' => 'Pengadaan Map & Kertas Kop Surat Sekretariat D3',
                'category' => 'Pengadaan Barang & ATK Unit',
                'unit_id' => 'SEKR-D3',
                'unit_kerja' => 'Sekretariat D3 Perhotelan',
                'department' => 'Sekretariat D3 Perhotelan',
                'qty' => 5,
                'unit' => 'rim',
                'price' => 275000,
                'academic_importance' => 'Standar',
                'applicant' => $stafSekreD3?->name ?? 'Siti Rahma (Staf Sekretariat D3)',
                'pemohon_id' => $stafSekreD3 ? (string)$stafSekreD3->id : null,
                'date' => '03 Okt 2026',
                'need_by' => '2026-10-08',
                'purpose' => 'Kebutuhan administrasi surat menyurat program studi D3 Perhotelan',
                'alur' => 'B',
                'status' => StatusPengajuan::DIAJUKAN->value,
                'details' => [
                    ['code_id' => 'KAT-001', 'name' => 'Kertas HVS A4 80gr PaperOne', 'qty' => 5, 'unit' => 'Rim', 'price' => 55000, 'needed_qty' => 5, 'stock_in_lab' => 0],
                ],
            ],
            [
                'id' => 'PR-2026-010',
                'item' => 'Pengadaan Berkas & Formulir Brosur PMB',
                'category' => 'Pengadaan Barang & ATK Unit',
                'unit_id' => 'PMB',
                'unit_kerja' => 'Penerimaan Mahasiswa Baru',
                'department' => 'Penerimaan Mahasiswa Baru',
                'qty' => 10,
                'unit' => 'rim',
                'price' => 550000,
                'academic_importance' => 'Standar',
                'applicant' => $stafPmb?->name ?? 'Rizky Ananda (Staf PMB)',
                'pemohon_id' => $stafPmb ? (string)$stafPmb->id : null,
                'date' => '04 Okt 2026',
                'need_by' => '2026-10-09',
                'purpose' => 'Kebutuhan berkas promosi dan pendaftaran mahasiswa baru',
                'alur' => 'B',
                'status' => StatusPengajuan::DIAJUKAN->value,
                'details' => [
                    ['code_id' => 'KAT-001', 'name' => 'Kertas HVS A4 80gr PaperOne', 'qty' => 10, 'unit' => 'Rim', 'price' => 55000, 'needed_qty' => 10, 'stock_in_lab' => 0],
                ],
            ],
        ];

        foreach ($requests as $r) {
            $details = $r['details'];
            unset($r['details']);

            $req = ProcurementRequest::updateOrCreate(['id' => $r['id']], $r);

            // Delete existing details before re-seeding
            RequestDetail::where('request_id', $req->id)->delete();
            foreach ($details as $d) {
                $d['request_id'] = $req->id;
                RequestDetail::create($d);
            }

            // Seed status_log
            StatusLog::create([
                'pengajuan_id' => $req->id,
                'dari' => null,
                'ke' => $req->status,
                'user_id' => null,
                'catatan' => 'Data awal seeding: ' . $req->status,
                'created_at' => now(),
            ]);
        }

        // Seed Penyelesaian Kasbon untuk PR-2026-007 (carry-over tombok Rp 50.000 Asdos Siti Rahmawati)
        KasbonPenyelesaian::updateOrCreate(
            ['pengajuan_id' => 'PR-2026-007'],
            [
                'jenis' => 'carry_over',
                'nominal' => 50000,
                'bukti_path' => null,
                'kasbon_tujuan_id' => null,
                'dicatat_oleh' => 'Ratna Sari (Keuangan Kitchen)',
                'tanggal' => '2026-09-18',
            ]
        );

        // 5. Seed Notifications
        $notifications = [
            [
                'id' => 'NOTIF-001',
                'title' => 'PR-2026-001 Menunggu Verifikasi Qty Koordinator',
                'desc' => 'Pengajuan bahan praktik Nasi Uduk Komplit dari Asdos siap ditinjau standarnya.',
                'time' => 'Baru saja',
                'target_role' => 'Koordinator',
                'request_id' => 'PR-2026-001',
                'read' => false,
            ],
            [
                'id' => 'NOTIF-002',
                'title' => 'PR-2026-002 Disetujui Koordinator & Siap Ditinjau Kaprodi',
                'desc' => 'Bahan Praktik D3 Perhotelan telah diverifikasi Koordinator & diteruskan ke Kaprodi.',
                'time' => '15 menit lalu',
                'target_role' => 'Kaprodi',
                'request_id' => 'PR-2026-002',
                'read' => false,
            ],
            [
                'id' => 'NOTIF-003',
                'title' => 'PR-2026-003 Menunggu Pencairan Dana Keuangan',
                'desc' => 'Kaprodi telah menyetujui pengajuan bahan Rendang Sapi. Menunggu transfer ke Asdos.',
                'time' => '30 menit lalu',
                'target_role' => 'Keuangan Kitchen',
                'request_id' => 'PR-2026-003',
                'read' => false,
            ],
        ];

        foreach ($notifications as $n) {
            Notification::updateOrCreate(['id' => $n['id']], $n);
        }
    }
}
