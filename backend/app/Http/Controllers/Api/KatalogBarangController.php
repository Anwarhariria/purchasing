<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KatalogBarang;
use Illuminate\Http\Request;

class KatalogBarangController extends Controller
{
    protected function checkAuthorizedRole(Request $request): bool
    {
        $user = $request->user();
        if (!$user) return false;
        return $user->isSuperAdmin() || $user->isKeuanganUmum();
    }

    public function index(Request $request)
    {
        $isManager = $this->checkAuthorizedRole($request);
        $showAll = $request->boolean('all', false) && $isManager;

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
            'satuan' => 'required|string|max:50',
            'harga_acuan' => 'required|numeric|min:0',
        ], [
            'nama.required' => 'Nama barang wajib diisi.',
            'satuan.required' => 'Satuan barang wajib diisi.',
            'harga_acuan.required' => 'Harga acuan barang wajib diisi.',
        ]);

        $id = $request->id;
        if (!$id) {
            $count = KatalogBarang::count() + 1;
            $id = sprintf('KAT-%03d', $count);
        }

        $item = KatalogBarang::create([
            'id' => $id,
            'kode' => $request->kode ?? ('BRG-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $request->nama), 0, 6))),
            'nama' => $request->nama,
            'kategori' => $request->kategori ?? 'Umum & ATK',
            'satuan' => $request->satuan,
            'harga_acuan' => (float)$request->harga_acuan,
            'stok_tersedia' => (float)($request->stok_tersedia ?? 0),
            'target_unit' => $request->target_unit ?? 'Seluruh Unit',
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

        $item->fill($request->only([
            'nama',
            'kode',
            'kategori',
            'satuan',
            'harga_acuan',
            'stok_tersedia',
            'target_unit',
            'aktif',
        ]));
        $item->save();

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
