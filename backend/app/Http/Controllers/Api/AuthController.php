<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public const ROLES = [
        'Asdos Kitchen',
        'Staf Unit',
        'Koordinator Lab',
        'Koordinator Unit',
        'Kaprodi',
        'Keuangan Kitchen',
        'Keuangan Umum',
        'Super Admin',
    ];

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Email atau kata sandi tidak valid.',
            ], 401);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login berhasil.',
            'token' => $token,
            'user' => [
                'id' => $user->code_id ?? ('USR-' . $user->id),
                'db_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'unit_id' => $user->unit_id,
                'department' => $user->department,
                'status' => $user->status,
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'status' => 'success',
            'user' => [
                'id' => $user->code_id ?? ('USR-' . $user->id),
                'db_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'unit_id' => $user->unit_id,
                'department' => $user->department,
                'status' => $user->status,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Logout berhasil.',
        ]);
    }

    public function users(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->isSuperAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Super Admin yang berhak mengakses daftar pengguna.',
            ], 403);
        }

        $users = User::all()->map(function ($u) {
            return [
                'id' => $u->code_id ?? ('USR-' . $u->id),
                'db_id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'unit_id' => $u->unit_id,
                'department' => $u->department,
                'status' => $u->status,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $users,
        ]);
    }

    public function storeUser(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->isSuperAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Super Admin yang berhak menambahkan pengguna.',
            ], 403);
        }

        $rules = [
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:3',
            'role' => ['required', 'string', Rule::in(self::ROLES)],
            'department' => 'nullable|string',
            'unit_id' => 'nullable|string|exists:units,id',
        ];

        if (in_array($request->role, ['Staf Unit', 'Koordinator Unit'], true)) {
            $rules['unit_id'] = 'required|string|exists:units,id';
        }

        $request->validate($rules);

        // Tolak Koordinator Unit kedua di unit yang sama (422)
        if ($request->role === 'Koordinator Unit') {
            $existing = User::where('role', 'Koordinator Unit')
                ->where('unit_id', $request->unit_id)
                ->exists();
            if ($existing) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unit ini sudah memiliki Koordinator Unit aktif. Hanya diperbolehkan satu Koordinator per unit kerja.',
                    'errors' => [
                        'unit_id' => ['Unit ini sudah memiliki Koordinator Unit aktif.'],
                    ],
                ], 422);
            }
        }

        $department = $request->department;
        if (empty($department)) {
            if ($request->unit_id) {
                $unit = Unit::find($request->unit_id);
                $department = $unit ? $unit->nama : 'Unit Kerja Kampus';
            } else {
                $department = 'Laboratorium Dapur & Restoran Perhotelan';
            }
        }

        $nextNum = (User::max('id') ?? 0) + 1;
        $newUser = User::create([
            'code_id' => sprintf('USR-%03d', $nextNum),
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'unit_id' => $request->unit_id,
            'department' => $department,
            'status' => 'Aktif',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'User berhasil ditambahkan.',
            'data' => [
                'id' => $newUser->code_id ?? ('USR-' . $newUser->id),
                'db_id' => $newUser->id,
                'name' => $newUser->name,
                'email' => $newUser->email,
                'role' => $newUser->role,
                'unit_id' => $newUser->unit_id,
                'department' => $newUser->department,
                'status' => $newUser->status,
            ],
        ], 201);
    }

    public function updateUser(Request $request, $id)
    {
        $user = $request->user();

        if (!$user || !$user->isSuperAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Super Admin yang berhak memperbarui data pengguna.',
            ], 403);
        }

        $targetUser = User::where('code_id', $id)->orWhere('id', $id)->first();
        if (!$targetUser) {
            return response()->json([
                'status' => 'error',
                'message' => 'User tidak ditemukan.',
            ], 404);
        }

        $effectiveRole = $request->filled('role') ? $request->role : $targetUser->role;
        $effectiveUnitId = $request->has('unit_id') ? $request->unit_id : $targetUser->unit_id;

        $rules = [
            'name' => 'sometimes|required|string',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($targetUser->id)],
            'password' => 'nullable|min:3',
            'role' => ['sometimes', 'required', 'string', Rule::in(self::ROLES)],
            'department' => 'nullable|string',
            'status' => 'sometimes|in:Aktif,Nonaktif',
            'unit_id' => 'sometimes|nullable|string|exists:units,id',
        ];

        if (in_array($effectiveRole, ['Staf Unit', 'Koordinator Unit'], true) && empty($effectiveUnitId)) {
            $rules['unit_id'] = 'required|string|exists:units,id';
        }

        $request->validate($rules);

        // Tolak Koordinator Unit kedua di unit yang sama (422)
        if ($effectiveRole === 'Koordinator Unit') {
            $existing = User::where('role', 'Koordinator Unit')
                ->where('unit_id', $effectiveUnitId)
                ->where('id', '!=', $targetUser->id)
                ->exists();
            if ($existing) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unit ini sudah memiliki Koordinator Unit aktif. Hanya diperbolehkan satu Koordinator per unit kerja.',
                    'errors' => [
                        'unit_id' => ['Unit ini sudah memiliki Koordinator Unit aktif.'],
                    ],
                ], 422);
            }
        }

        if ($request->has('name')) $targetUser->name = $request->name;
        if ($request->has('email')) $targetUser->email = $request->email;
        if ($request->filled('password')) $targetUser->password = Hash::make($request->password);
        if ($request->has('role')) $targetUser->role = $request->role;
        if ($request->has('unit_id')) $targetUser->unit_id = $request->unit_id;
        if ($request->has('department')) {
            $targetUser->department = $request->department;
        } elseif ($request->has('unit_id') && $request->unit_id) {
            $unit = Unit::find($request->unit_id);
            if ($unit) $targetUser->department = $unit->nama;
        }
        if ($request->has('status')) $targetUser->status = $request->status;

        $targetUser->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Data user berhasil diperbarui.',
            'data' => [
                'id' => $targetUser->code_id ?? ('USR-' . $targetUser->id),
                'db_id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
                'role' => $targetUser->role,
                'unit_id' => $targetUser->unit_id,
                'department' => $targetUser->department,
                'status' => $targetUser->status,
            ],
        ]);
    }
}
