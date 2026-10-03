<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
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
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'department' => $user->department,
                'status' => $user->status,
            ],
        ]);
    }

    public function quickLogin(Request $request)
    {
        $role = $request->input('role');
        $email = $request->input('email');

        $query = User::query();
        if ($email) {
            $query->where('email', $email);
        } elseif ($role) {
            $query->where('role', $role);
        }

        $user = $query->first();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'User tidak ditemukan.',
            ], 404);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login instan berhasil.',
            'token' => $token,
            'user' => [
                'id' => $user->code_id ?? ('USR-' . $user->id),
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
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
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
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

    public function users()
    {
        $users = User::all()->map(function ($u) {
            return [
                'id' => $u->code_id ?? ('USR-' . $u->id),
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
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
        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:3',
            'role' => 'required|string',
            'department' => 'required|string',
        ]);

        $nextNum = User::count() + 1;
        $user = User::create([
            'code_id' => sprintf('USR-%03d', $nextNum),
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'department' => $request->department,
            'status' => 'Aktif',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'User berhasil ditambahkan.',
            'data' => $user,
        ], 201);
    }
}
