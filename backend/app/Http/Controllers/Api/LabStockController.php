<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LabStock;
use Illuminate\Http\Request;

class LabStockController extends Controller
{
    public function index(Request $request)
    {
        $stocks = LabStock::orderBy('name')->get();

        return response()->json([
            'status' => 'success',
            'data' => $stocks,
        ]);
    }

    public function inventoryMap()
    {
        $stocks = LabStock::all();
        $map = [];

        foreach ($stocks as $s) {
            $map[$s->name] = [
                'id' => $s->id,
                'stock' => (float)$s->current_stock,
                'unit' => $s->unit,
                'costPerUnit' => (float)$s->cost_per_unit,
                'category' => $s->category,
                'minStock' => (float)$s->min_stock,
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $map,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:lab_stocks,name',
            'unit' => 'required|string',
        ]);

        $count = LabStock::count() + 1;
        $id = $request->id ?? sprintf('STK-%03d', $count);

        $stock = LabStock::create([
            'id' => $id,
            'name' => $request->name,
            'category' => $request->category ?? 'Bahan Dapur Lab',
            'current_stock' => $request->current_stock ?? $request->stock ?? 0,
            'unit' => $request->unit,
            'min_stock' => $request->min_stock ?? 2,
            'cost_per_unit' => $request->cost_per_unit ?? $request->cost ?? 0,
            'last_restocked' => $request->last_restocked ?? now()->toDateString(),
            'expiry_date' => $request->expiry_date,
            'location' => $request->location ?? 'Gudang Bahan Kering & Cold Storage',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Stok berhasil ditambahkan.',
            'data' => $stock,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $stock = LabStock::find($id);

        if (!$stock) {
            return response()->json([
                'status' => 'error',
                'message' => 'Stok tidak ditemukan.',
            ], 404);
        }

        if ($request->has('current_stock')) {
            $stock->current_stock = $request->current_stock;
        } elseif ($request->has('stock')) {
            $stock->current_stock = $request->stock;
        }

        if ($request->has('unit')) $stock->unit = $request->unit;
        if ($request->has('cost_per_unit')) $stock->cost_per_unit = $request->cost_per_unit;
        if ($request->has('min_stock')) $stock->min_stock = $request->min_stock;
        if ($request->has('category')) $stock->category = $request->category;
        if ($request->has('location')) $stock->location = $request->location;
        if ($request->has('expiry_date')) $stock->expiry_date = $request->expiry_date;

        $stock->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Stok berhasil diperbarui.',
            'data' => $stock,
        ]);
    }

    public function destroy($id)
    {
        $stock = LabStock::find($id);

        if (!$stock) {
            return response()->json([
                'status' => 'error',
                'message' => 'Stok tidak ditemukan.',
            ], 404);
        }

        $stock->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Stok berhasil dihapus.',
        ]);
    }
}
