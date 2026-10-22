<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KatalogBarang;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class KatalogBarangController extends Controller
{
    protected function checkAuthorizedRole(Request $request): bool
    {
        $user = $request->user();
        if (!$user) return false;
        return $user->isSuperAdmin() || $user->isKeuanganUmum();
    }

    protected function validationMessages(): array
    {
        return [
            'nama.required' => 'Nama barang wajib diisi.',
            'nama.string' => 'Nama barang harus berupa teks.',
            'nama.max' => 'Nama barang maksimal 255 karakter.',
            'kode.string' => 'Kode barang harus berupa teks.',
            'kode.max' => 'Kode barang maksimal 50 karakter.',
            'kode.unique' => 'Kode barang sudah digunakan oleh item lain.',
            'kategori.string' => 'Kategori barang harus berupa teks.',
            'kategori.max' => 'Kategori barang maksimal 100 karakter.',
            'satuan.required' => 'Satuan barang wajib diisi.',
            'satuan.string' => 'Satuan barang harus berupa teks.',
            'satuan.max' => 'Satuan barang maksimal 50 karakter.',
            'harga_acuan.required' => 'Harga acuan barang wajib diisi.',
            'harga_acuan.numeric' => 'Harga acuan harus berupa angka.',
            'harga_acuan.min' => 'Harga acuan minimal Rp 1.',
            'harga_acuan.max' => 'Harga acuan maksimal Rp 1.000.000.000.',
            'stok_tersedia.numeric' => 'Stok tersedia harus berupa angka.',
            'stok_tersedia.min' => 'Stok tersedia tidak boleh kurang dari 0.',
            'target_unit.string' => 'Target unit harus berupa teks.',
            'target_unit.max' => 'Target unit maksimal 100 karakter.',
            'aktif.boolean' => 'Status aktif harus berupa boolean.',
        ];
    }

    public function index(Request $request)
    {
        $isManager = $this->checkAuthorizedRole($request);
        $showAll = ($request->boolean('all', false) || $request->input('all') == '1') && $isManager;

        $query = KatalogBarang::query();
        if (!$showAll) {
            $query->where('aktif', true);
        }

        if ($request->filled('kategori')) {
            $query->where('kategori', $request->kategori);
        }

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($sub) use ($q) {
                $sub->where('nama', 'like', "%{$q}%")
                    ->orWhere('kode', 'like', "%{$q}%");
            });
        }

        $items = $query->orderBy('nama')->get();

        return response()->json([
            'status' => 'success',
            'data' => $items,
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->checkAuthorizedRole($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Keuangan Umum dan Super Admin yang berhak menambah item katalog barang.',
            ], 403);
        }

        $request->validate([
            'nama' => 'required|string|max:255',
            'kode' => 'nullable|string|max:50|unique:katalog_barang,kode',
            'kategori' => 'nullable|string|max:100',
            'satuan' => 'required|string|max:50',
            'harga_acuan' => 'required|numeric|min:1|max:1000000000',
            'stok_tersedia' => 'nullable|numeric|min:0',
            'target_unit' => 'nullable|string|max:100',
            'aktif' => 'nullable|boolean',
        ], $this->validationMessages());

        $id = $request->id;
        if (!$id) {
            $maxId = 0;
            $existingIds = KatalogBarang::pluck('id');
            foreach ($existingIds as $itemId) {
                if (preg_match('/KAT-(\d+)/', (string)$itemId, $matches)) {
                    $num = (int)$matches[1];
                    if ($num > $maxId) {
                        $maxId = $num;
                    }
                }
            }
            $id = sprintf('KAT-%03d', $maxId + 1);
        }

        $kode = $request->kode;
        if (!$kode) {
            $baseKode = 'BRG-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $request->nama), 0, 6));
            $kode = $baseKode;
            $k = 1;
            while (KatalogBarang::where('kode', $kode)->exists()) {
                $kode = $baseKode . '-' . $k++;
            }
        }

        $item = KatalogBarang::create([
            'id' => $id,
            'kode' => $kode,
            'nama' => trim($request->nama),
            'kategori' => $request->kategori ? trim($request->kategori) : 'Umum & ATK',
            'satuan' => trim($request->satuan),
            'harga_acuan' => (float)$request->harga_acuan,
            'stok_tersedia' => (float)($request->stok_tersedia ?? 0),
            'target_unit' => $request->target_unit ? trim($request->target_unit) : 'Seluruh Unit',
            'aktif' => $request->boolean('aktif', true),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Barang berhasil ditambahkan ke katalog.',
            'data' => $item,
        ], 201);
    }

    public function show($id)
    {
        $item = KatalogBarang::find($id);
        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'Item katalog barang tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $item,
        ]);
    }

    public function update(Request $request, $id)
    {
        if (!$this->checkAuthorizedRole($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Keuangan Umum dan Super Admin yang berhak mengubah item katalog barang.',
            ], 403);
        }

        $item = KatalogBarang::find($id);
        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'Item katalog barang tidak ditemukan.',
            ], 404);
        }

        $request->validate([
            'nama' => 'sometimes|required|string|max:255',
            'kode' => "sometimes|nullable|string|max:50|unique:katalog_barang,kode,{$id},id",
            'kategori' => 'sometimes|nullable|string|max:100',
            'satuan' => 'sometimes|required|string|max:50',
            'harga_acuan' => 'sometimes|required|numeric|min:1|max:1000000000',
            'stok_tersedia' => 'sometimes|nullable|numeric|min:0',
            'target_unit' => 'sometimes|nullable|string|max:100',
            'aktif' => 'sometimes|boolean',
        ], $this->validationMessages());

        $oldHarga = (float)$item->harga_acuan;

        if ($request->has('nama')) $item->nama = trim($request->nama);
        if ($request->has('kode')) $item->kode = $request->kode ? trim($request->kode) : null;
        if ($request->has('kategori')) $item->kategori = $request->kategori ? trim($request->kategori) : 'Umum & ATK';
        if ($request->has('satuan')) $item->satuan = trim($request->satuan);
        if ($request->has('harga_acuan')) $item->harga_acuan = (float)$request->harga_acuan;
        if ($request->has('stok_tersedia')) $item->stok_tersedia = (float)$request->stok_tersedia;
        if ($request->has('target_unit')) $item->target_unit = $request->target_unit ? trim($request->target_unit) : 'Seluruh Unit';
        if ($request->has('aktif')) $item->aktif = $request->boolean('aktif');

        $item->save();

        $newHarga = (float)$item->harga_acuan;
        if ($oldHarga !== $newHarga) {
            Log::info("Harga acuan {$item->nama} diubah dari Rp{$oldHarga} menjadi Rp{$newHarga}");
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Item katalog barang berhasil diperbarui.',
            'data' => $item,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        if (!$this->checkAuthorizedRole($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Keuangan Umum dan Super Admin yang berhak menonaktifkan item katalog barang.',
            ], 403);
        }

        $item = KatalogBarang::find($id);
        if (!$item) {
            return response()->json([
                'status' => 'error',
                'message' => 'Item katalog barang tidak ditemukan.',
            ], 404);
        }

        // Nonaktifkan barang (soft deactivation sesuai SRS UC-24)
        $item->aktif = false;
        $item->save();

        return response()->json([
            'status' => 'success',
            'message' => "Item '{$item->nama}' berhasil dinonaktifkan dari katalog.",
            'data' => $item,
        ]);
    }
}
