<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\Notification;
use App\Models\LabStock;
use App\Models\ProcurementActivityLog;
use App\Models\StatusLog;
use App\Enums\StatusPengajuan;
use App\Models\KasbonPenyelesaian;
use App\Models\Curriculum;
use App\Models\KatalogBarang;
use App\Models\Ramalan;
use App\Models\User;
use App\Services\CalculationService;
use App\Services\WorkflowService;
use App\Http\Requests\StoreProcurementRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ProcurementRequestController extends Controller
{
    protected function formatRequest(ProcurementRequest $req)
    {
        $isAlurB = ($req->alur === 'B') || ($req->category !== 'Bahan Praktik Masak');
        $unitId = $isAlurB ? $req->unit_id : null;
        $reqPeriod = substr($req->date ?: ($req->created_at ? $req->created_at->format('Y-m') : now()->format('Y-m')), 0, 7);

        return [
            'id' => $req->id,
            'alur' => $req->alur ?? ($req->category === 'Bahan Praktik Masak' ? 'A' : 'B'),
            'unitKerja' => $req->unit_kerja,
            'unit_kerja' => $req->unit_kerja,
            'unitId' => $unitId,
            'unit_id' => $unitId,
            'item' => $req->item,
            'category' => $req->category,
            'prodi' => $req->prodi,
            'semester' => (int)$req->semester,
            'course' => $req->course,
            'menu' => $req->menu,
            'qty' => (int)$req->qty,
            'unit' => $req->unit,
            'price' => (float)$req->price,
            'academicImportance' => $req->academic_importance,
            'academic_importance' => $req->academic_importance,
            'applicant' => $req->applicant,
            'pemohon_id' => $req->pemohon_id,
            'pemohonId' => $req->pemohon_id,
            'department' => $req->department,
            'date' => $req->date,
            'needBy' => $req->need_by,
            'need_by' => $req->need_by,
            'deadline' => $req->deadline,
            'purpose' => $req->purpose,
            'status' => $req->status,
            'note' => $req->note,
            'rejectionReason' => $req->rejection_reason,
            'rejection_reason' => $req->rejection_reason,
            'faktorF' => $req->faktor_f !== null ? (float)$req->faktor_f : null,
            'faktor_f' => $req->faktor_f !== null ? (float)$req->faktor_f : null,
            'catatanKeuangan' => $req->catatan_keuangan,
            'catatan_keuangan' => $req->catatan_keuangan,
            'nominalTransfer' => (float)($req->nominal_transfer ?? 0),
            'nominal_transfer' => (float)($req->nominal_transfer ?? 0),
            'buktiTransfer' => $req->bukti_transfer,
            'bukti_transfer' => $req->bukti_transfer,
            'disbursedAmount' => (float)($req->disbursed_amount ?? 0),
            'disbursed_amount' => (float)($req->disbursed_amount ?? 0),
            'danaDiterima' => (float)($req->dana_diterima > 0 ? $req->dana_diterima : ($req->disbursed_amount ?? 0)),
            'dana_diterima' => (float)($req->dana_diterima > 0 ? $req->dana_diterima : ($req->disbursed_amount ?? 0)),
            'actualSpent' => (float)($req->actual_spent ?? 0),
            'actual_spent' => (float)($req->actual_spent ?? 0),
            'refundAmount' => (float)($req->refund_amount ?? 0),
            'refund_amount' => (float)($req->refund_amount ?? 0),
            'deficitAmount' => (float)($req->deficit_amount ?? 0),
            'deficit_amount' => (float)($req->deficit_amount ?? 0),
            'receiptImages' => $req->receipt_images ?? [],
            'receipt_images' => $req->receipt_images ?? [],
            'penyelesaian' => ($req->penyelesaian ?? collect())->map(function ($p) {
                return [
                    'id' => $p->id,
                    'pengajuanId' => $p->pengajuan_id,
                    'pengajuan_id' => $p->pengajuan_id,
                    'jenis' => $p->jenis,
                    'nominal' => (float)$p->nominal,
                    'buktiPath' => $p->bukti_path,
                    'bukti_path' => $p->bukti_path,
                    'kasbonTujuanId' => $p->kasbon_tujuan_id,
                    'kasbon_tujuan_id' => $p->kasbon_tujuan_id,
                    'dicatatOleh' => $p->dicatat_oleh,
                    'dicatat_oleh' => $p->dicatat_oleh,
                    'tanggal' => $p->tanggal instanceof \DateTimeInterface ? $p->tanggal->format('Y-m-d') : (string)$p->tanggal,
                ];
            }),
            'activityLogs' => ($req->activityLogs ?? collect())->map(function ($log) {
                return [
                    'id' => $log->id,
                    'procurementRequestId' => $log->procurement_request_id,
                    'procurement_request_id' => $log->procurement_request_id,
                    'userId' => $log->user_id,
                    'user_id' => $log->user_id,
                    'actorName' => $log->actor_name,
                    'actor_name' => $log->actor_name,
                    'actorRole' => $log->actor_role,
                    'actor_role' => $log->actor_role,
                    'action' => $log->action,
                    'statusFrom' => $log->status_from,
                    'status_from' => $log->status_from,
                    'statusTo' => $log->status_to,
                    'status_to' => $log->status_to,
                    'notes' => $log->notes,
                    'createdAt' => $log->created_at?->format('Y-m-d H:i:s'),
                    'created_at' => $log->created_at?->format('Y-m-d H:i:s'),
                ];
            }),
            'details' => $req->details->map(function ($d) use ($isAlurB, $unitId, $reqPeriod, $req) {
                $qtyRamalan = null;
                $tanpaModel = false;
                if ($isAlurB) {
                    $bId = $d->code_id;
                    if ($bId && preg_match('/KAT-\d+/', $bId, $m)) {
                        $bId = $m[0];
                    }
                    if (!$bId || !str_starts_with($bId, 'KAT-')) {
                        $cleanName = strtolower(trim($d->name));
                        $kat = KatalogBarang::whereRaw('LOWER(TRIM(nama)) = ?', [$cleanName])
                            ->orWhere('kode', $d->code_id ?? '')
                            ->first();
                        if ($kat) {
                            $bId = $kat->kode ?: (string)$kat->id;
                        }
                    }
                    if ($bId) {
                        $ramalan = Ramalan::where(function ($q) use ($unitId, $req) {
                                $q->where('unit_id', $unitId)
                                  ->orWhere('unit_id', $req->unit_id);
                            })
                            ->where(function ($q) use ($bId, $d) {
                                $q->where('katalog_barang_id', $bId)
                                  ->orWhereRaw('LOWER(TRIM(katalog_barang_id)) = ?', [strtolower(trim($d->name))]);
                            })
                            ->where('periode', $reqPeriod)
                            ->first();
                        if (!$ramalan) {
                            $ramalan = Ramalan::where(function ($q) use ($unitId, $req) {
                                    $q->where('unit_id', $unitId)
                                      ->orWhere('unit_id', $req->unit_id);
                                })
                                ->where(function ($q) use ($bId, $d) {
                                    $q->where('katalog_barang_id', $bId)
                                      ->orWhereRaw('LOWER(TRIM(katalog_barang_id)) = ?', [strtolower(trim($d->name))]);
                                })
                                ->latest('periode')
                                ->first();
                        }
                        if ($ramalan) {
                            $qtyRamalan = (float)$ramalan->qty_prediksi;
                            $tanpaModel = (bool)$ramalan->tanpa_model;
                        }
                    }
                }

                return [
                    'id' => $d->code_id ?? ('D-' . $d->id),
                    'name' => $d->name,
                    'qty' => (float)$d->qty,
                    'qtyFinal' => $d->qty_final !== null ? (float)$d->qty_final : null,
                    'qty_final' => $d->qty_final !== null ? (float)$d->qty_final : null,
                    'qtyRamalan' => $qtyRamalan,
                    'qty_ramalan' => $qtyRamalan,
                    'tanpaModel' => $tanpaModel,
                    'tanpa_model' => $tanpaModel,
                    'unit' => $d->unit,
                    'price' => (float)$d->price,
                    'neededQty' => (float)($d->needed_qty ?? $d->qty),
                    'needed_qty' => (float)($d->needed_qty ?? $d->qty),
                    'stockInLab' => (float)($d->stock_in_lab ?? 0),
                    'stock_in_lab' => (float)($d->stock_in_lab ?? 0),
                ];
            }),
            'sumber' => $req->sumber ?? 'riil',
            'created_at' => $req->created_at,
            'updated_at' => $req->updated_at,
        ];
    }

    public function index(Request $request)
    {
        $query = ProcurementRequest::riil()->with(['details', 'activityLogs', 'penyelesaian'])->orderBy('created_at', 'desc');

        // Filter Rentang Periode (Start Month/Year s/d End Month/Year)
        if ($request->filled('start_month') && $request->filled('start_year') && $request->filled('end_month') && $request->filled('end_year')) {
            try {
                $startDate = Carbon::createFromDate((int)$request->start_year, (int)$request->start_month, 1)->startOfMonth();
                $endDate = Carbon::createFromDate((int)$request->end_year, (int)$request->end_month, 1)->endOfMonth();
                $query->whereBetween('created_at', [$startDate, $endDate]);
            } catch (\Exception $e) {
                // Fallback gracefully if dates are invalid
            }
        } elseif ($request->filled('start_date') && $request->filled('end_date')) {
            try {
                $startDate = Carbon::parse($request->start_date)->startOfDay();
                $endDate = Carbon::parse($request->end_date)->endOfDay();
                $query->whereBetween('created_at', [$startDate, $endDate]);
            } catch (\Exception $e) {
                // Fallback gracefully
            }
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('prodi') && $request->prodi) {
            $query->where('prodi', $request->prodi);
        }

        // Filter berdasarkan peran pengguna yang login sesuai Policy
        $user = $request->user();
        if ($user) {
            $this->applyRoleScope($query, $user);
        }

        $requests = $query->get()->map(fn($r) => $this->formatRequest($r));

        return response()->json([
            'status' => 'success',
            'data' => $requests,
        ]);
    }

    public function show($id)
    {
        $req = ProcurementRequest::riil()->with(['details', 'activityLogs', 'penyelesaian'])->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $this->authorize('view', $req);

        return response()->json([
            'status' => 'success',
            'data' => $this->formatRequest($req),
        ]);
    }

    public function store(StoreProcurementRequest $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthenticated.'], 401);
        }

        $alur = $request->alur ?? ($request->category === 'Bahan Praktik Masak' ? 'A' : 'B');

        // Otorisasi peran pemohon: Alur A hanya Asdos Kitchen, Alur B hanya Staf Unit (403 selain itu)
        if ($alur === 'A' && !$user->isAsdosKitchen()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Asdos Kitchen yang berhak mengajukan pengadaan Alur A.',
            ], 403);
        }

        if ($alur === 'B' && !$user->isStafUnit()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Staf Unit yang berhak mengajukan pengadaan Alur B.',
            ], 403);
        }

        // ID pengajuan selalu dibuat oleh server
        $count = ProcurementRequest::count() + 1;
        $id = $alur === 'B' ? sprintf('PO-2026-B%02d', $count) : sprintf('PR-2026-%03d', $count);
        while (ProcurementRequest::where('id', $id)->exists()) {
            $count++;
            $id = $alur === 'B' ? sprintf('PO-2026-B%02d', $count) : sprintf('PR-2026-%03d', $count);
        }

        $detailsToCreate = [];
        $totalPrice = 0.0;
        $totalQty = 0.0;
        $menuName = $request->menu ?? $request->item;
        $prodi = $request->prodi;
        $course = $request->course;
        $semester = $request->semester;

        if ($alur === 'A') {
            // UC-19: Backend menghitung per bahan: kebutuhan = gram_per_kelompok x jml_kelompok; qty_usulan = max(0, kebutuhan - stok_chiller)
            $curriculum = null;
            if ($request->filled('kurikulum_id')) {
                $curriculum = Curriculum::find($request->kurikulum_id);
            } elseif ($request->filled('curriculum_id')) {
                $curriculum = Curriculum::find($request->curriculum_id);
            } elseif ($menuName) {
                $curriculum = Curriculum::where('menu_name', $menuName)->first();
            }

            $jmlKelompok = (int)($request->input('jml_kelompok') ?? $request->input('group_count') ?? $request->input('groupCount') ?? 1);
            if ($jmlKelompok < 1) {
                $jmlKelompok = 1;
            }

            if ($curriculum) {
                $prodi = $prodi ?: $curriculum->prodi;
                $course = $course ?: $curriculum->course;
                $semester = $semester ?: $curriculum->semester;

                $calc = CalculationService::processCurriculumIngredients($curriculum, $jmlKelompok);
                $detailsToCreate = $calc['details'];
                $totalPrice = $calc['total_price'];
                $totalQty = $calc['total_qty'];
            } elseif ($request->has('details') && is_array($request->details)) {
                $dIdx = 1;
                foreach ($request->details as $d) {
                    $gramPerKelompok = (float)($d['needed_qty'] ?? $d['neededQty'] ?? $d['gram_per_kelompok'] ?? $d['qty'] ?? 1);
                    $labStock = LabStock::where('name', $d['name'])->first();
                    $stokChiller = $labStock ? (float)$labStock->current_stock : (float)($d['stock_in_lab'] ?? $d['stockInLab'] ?? 0);
                    $calc = CalculationService::calculateUc19($gramPerKelompok, $jmlKelompok, $stokChiller);
                    $price = (float)($labStock?->cost_per_unit ?? $d['price'] ?? 0);

                    $subtotal = $calc['qty_usulan'] * $price;
                    $totalPrice += $subtotal;
                    $totalQty += $calc['qty_usulan'];

                    $detailsToCreate[] = [
                        'code_id' => $d['id'] ?? ('D-' . sprintf('%02d', $dIdx++)),
                        'name' => $d['name'],
                        'qty' => $calc['qty_usulan'],
                        'needed_qty' => $calc['kebutuhan'],
                        'stock_in_lab' => $calc['stok_saat_itu'],
                        'unit' => $d['unit'] ?? $labStock?->unit ?? 'kg',
                        'price' => $price,
                    ];
                }
            }
        } else {
            // Alur B: Validasi barang ada dan aktif di katalog_barang. Harga acuan diambil dari katalog.
            $inputDetails = $request->details;
            if (!is_array($inputDetails) || empty($inputDetails)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Rincian barang logistik wajib diisi untuk Alur B.',
                ], 422);
            }

            $dIdx = 1;
            foreach ($inputDetails as $d) {
                $namaBarang = trim($d['name'] ?? $d['nama'] ?? '');
                $catalogId = $d['katalog_barang_id'] ?? $d['code_id'] ?? $d['id'] ?? null;
                $qty = (float)($d['qty'] ?? 0);

                if ($qty <= 0) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "Kuantitas untuk barang '{$namaBarang}' harus lebih dari 0.",
                    ], 422);
                }

                $katalogItem = null;
                if ($catalogId && str_starts_with($catalogId, 'KAT-')) {
                    $katalogItem = KatalogBarang::find($catalogId);
                }
                if (!$katalogItem && $namaBarang !== '') {
                    $katalogItem = KatalogBarang::where('nama', $namaBarang)->first();
                }

                if (!$katalogItem || !$katalogItem->aktif) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "Barang '{$namaBarang}' tidak ditemukan atau tidak aktif di katalog barang.",
                    ], 422);
                }

                $hargaAcuan = (float)$katalogItem->harga_acuan;
                $subtotal = $qty * $hargaAcuan;
                $totalPrice += $subtotal;
                $totalQty += $qty;

                $detailsToCreate[] = [
                    'code_id' => $katalogItem->id,
                    'name' => $katalogItem->nama,
                    'qty' => $qty,
                    'needed_qty' => $qty,
                    'stock_in_lab' => (float)$katalogItem->stok_tersedia,
                    'unit' => $katalogItem->satuan,
                    'price' => $hargaAcuan,
                ];
            }
        }

        $itemName = $request->item ?? $request->menu ?? ($alur === 'A' ? ($menuName ?: 'Pengajuan Praktikum Kitchen') : 'Pengadaan Logistik & ATK Unit');
        $unitId = ($alur === 'B') ? ($user->unit_id ?? $request->unit_id ?? $request->unitKerja) : null;
        $department = $user->department ?? ($alur === 'A' ? 'Laboratorium Dapur & Restoran Perhotelan' : ($request->unitKerja ?? $user->unit_id ?? 'Umum'));

        $req = ProcurementRequest::create([
            'id' => $id,
            'item' => $itemName,
            'category' => $request->category ?? ($alur === 'A' ? 'Bahan Praktik Masak' : 'Logistik & ATK Unit'),
            'prodi' => $prodi,
            'semester' => $semester,
            'course' => $course,
            'menu' => $menuName,
            'qty' => $totalQty > 0 ? (int)$totalQty : ($request->qty ?? 1),
            'unit' => $request->unit ?? ($alur === 'A' ? 'kg/unit' : 'items'),
            'price' => $totalPrice > 0 ? $totalPrice : ($request->price ?? 0),
            'academic_importance' => $request->academicImportance ?? $request->academic_importance ?? 'Standar',
            'applicant' => $user->name,
            'pemohon_id' => (string)$user->id,
            'department' => $department,
            'date' => $request->date ?? Carbon::now()->isoFormat('DD MMM YYYY'),
            'need_by' => $request->tanggal_butuh ?? $request->needBy ?? $request->need_by ?? Carbon::now()->addDays(5)->format('Y-m-d'),
            'deadline' => $request->deadline ?? $request->needBy ?? $request->need_by,
            'purpose' => $request->purpose ?? ($alur === 'A' ? 'Praktikum Perkuliahan Kuliner' : 'Kebutuhan Operasional Unit Kerja'),
            'alur' => $alur,
            'unit_kerja' => $user->unit_id ?? $request->unitKerja ?? $request->unit_kerja,
            'unit_id' => $unitId,
            'status' => StatusPengajuan::DIAJUKAN->value,
            'note' => $request->note,
            'disbursed_amount' => 0,
            'dana_diterima' => 0,
            'actual_spent' => 0,
            'refund_amount' => 0,
            'deficit_amount' => 0,
        ]);

        // Insert details terhitung
        foreach ($detailsToCreate as $dData) {
            RequestDetail::create(array_merge($dData, ['request_id' => $req->id]));
        }

        // Catat Audit Trail Awal (DIAJUKAN)
        StatusLog::create([
            'pengajuan_id' => $req->id,
            'dari' => null,
            'ke' => StatusPengajuan::DIAJUKAN->value,
            'user_id' => auth()->id(),
            'catatan' => $req->purpose ?? 'Pengajuan dibuat oleh pemohon.',
            'created_at' => now(),
        ]);

        ProcurementActivityLog::create([
            'procurement_request_id' => $req->id,
            'user_id' => auth()->id(),
            'actor_name' => $req->applicant,
            'actor_role' => $user->role ?? 'Pemohon',
            'action' => 'Pengajuan Dibuat',
            'status_from' => null,
            'status_to' => StatusPengajuan::DIAJUKAN->value,
            'notes' => $req->purpose ?? 'Pengajuan kebutuhan bahan praktik diajukan oleh Asdos.',
        ]);

        // Kirim notifikasi ke Koordinator terkait berbasis user
        WorkflowService::sendTransitionNotifications($req, null, StatusPengajuan::DIAJUKAN->value);

        $req->load(['details', 'activityLogs', 'penyelesaian']);

        return response()->json([
            'status' => 'success',
            'message' => 'Pengajuan berhasil dibuat.',
            'data' => $this->formatRequest($req),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $req = ProcurementRequest::with('details')->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        // Otorisasi lewat ProcurementRequestPolicy:
        // (a) Koordinator Lab (Alur A) / Koordinator Unit (Alur B) saat status DIAJUKAN
        // (b) Pemohon saat status DITOLAK_KOORD atau DITOLAK_KAPRODI
        // Selain itu -> 403
        $this->authorize('update', $req);

        // JANGAN PERNAH menerima field "status" di sini — perubahan status hanya via WorkflowService
        // Input "price" dari client juga diabaikan (dihitung ulang dari katalog/master)

        $fields = [
            'item', 'category', 'prodi', 'semester', 'course', 'menu',
            'purpose', 'note'
        ];

        foreach ($fields as $field) {
            if ($request->has($field)) {
                $req->$field = $request->$field;
            }
        }

        if ($request->has('academicImportance')) {
            $req->academic_importance = $request->academicImportance;
        } elseif ($request->has('academic_importance')) {
            $req->academic_importance = $request->academic_importance;
        }

        if ($request->has('needBy')) {
            $req->need_by = $request->needBy;
        } elseif ($request->has('need_by')) {
            $req->need_by = $request->need_by;
        }

        $alur = WorkflowService::resolveWorkflow($req);

        // Update details jika dikirimkan
        if ($request->has('details') && is_array($request->details)) {
            $submittedDetails = $request->details;

            foreach ($submittedDetails as $d) {
                $name = trim($d['name'] ?? '');
                $qty = isset($d['qty']) ? (float)$d['qty'] : 1.0;
                $isDeleted = !empty($d['is_deleted']) || !empty($d['deleted']);
                $alasanHapus = $d['alasan_hapus'] ?? $d['reason'] ?? null;

                // Harga dari katalog / backend
                $hargaSatuan = 0.0;
                $unit = $d['unit'] ?? 'item';

                if ($alur === 'B') {
                    $katalog = KatalogBarang::where('nama', $name)->orWhere('kode', $d['code_id'] ?? '')->first();
                    $hargaSatuan = $katalog ? (float)$katalog->harga_acuan : 0.0;
                    if ($katalog && empty($d['unit'])) {
                        $unit = $katalog->satuan;
                    }
                } else {
                    $existing = $req->details->firstWhere('name', $name);
                    if ($existing) {
                        $hargaSatuan = (float)$existing->price;
                        $unit = $existing->unit;
                    }
                }

                // Cari record detail yang ada
                $existingRecord = null;
                if (!empty($d['id'])) {
                    $cleanId = str_replace('D-', '', $d['id']);
                    $existingRecord = RequestDetail::where('request_id', $req->id)
                        ->where(function ($q) use ($d, $cleanId) {
                            $q->where('code_id', $d['id'])->orWhere('id', $cleanId);
                        })->first();
                }
                if (!$existingRecord) {
                    $existingRecord = RequestDetail::where('request_id', $req->id)->where('name', $name)->first();
                }

                if ($isDeleted) {
                    if ($existingRecord) {
                        $existingRecord->alasan_hapus = $alasanHapus ?? ('Dihapus oleh ' . auth()->user()->role);
                        $existingRecord->save();
                        $existingRecord->delete(); // Soft delete
                    }
                } else {
                    if ($existingRecord) {
                        $existingRecord->qty = $qty;
                        $existingRecord->needed_qty = $d['neededQty'] ?? $d['needed_qty'] ?? $qty;
                        if ($hargaSatuan > 0) {
                            $existingRecord->price = $hargaSatuan;
                        }
                        $existingRecord->save();
                    } else {
                        // Tambah item baru
                        $newCodeId = $d['id'] ?? null;
                        if ($alur === 'B') {
                            $newCodeId = $katalog ? $katalog->id : ($d['code_id'] ?? $d['id'] ?? ('KAT-' . sprintf('%03d', RequestDetail::where('request_id', $req->id)->withTrashed()->count() + 1)));
                        } else {
                            $newCodeId = $d['id'] ?? ('D-' . sprintf('%02d', RequestDetail::where('request_id', $req->id)->withTrashed()->count() + 1));
                        }

                        RequestDetail::create([
                            'code_id' => $newCodeId,
                            'request_id' => $req->id,
                            'name' => $name,
                            'qty' => $qty,
                            'needed_qty' => $d['neededQty'] ?? $d['needed_qty'] ?? $qty,
                            'stock_in_lab' => $d['stockInLab'] ?? $d['stock_in_lab'] ?? 0,
                            'unit' => $unit,
                            'price' => $hargaSatuan,
                        ]);
                    }
                }
            }
        }

        // Hitung ulang total price & total qty dari item aktif (non-soft-deleted)
        $activeDetails = RequestDetail::where('request_id', $req->id)->get();
        $totalPrice = 0.0;
        $totalQty = 0.0;
        foreach ($activeDetails as $ad) {
            $totalPrice += ((float)$ad->qty * (float)$ad->price);
            $totalQty += (float)$ad->qty;
        }

        $req->price = $totalPrice;
        $req->qty = $totalQty > 0 ? (int)$totalQty : 1;
        $req->save();

        $req->load('details');

        return response()->json([
            'status' => 'success',
            'message' => 'Pengajuan berhasil diperbarui.',
            'data' => $this->formatRequest($req),
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $req = ProcurementRequest::with(['details', 'activityLogs', 'penyelesaian'])->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $request->validate([
            'status' => 'required|string',
        ]);

        $financialStatuses = [
            StatusPengajuan::DANA_DICAIRKAN->value,
            StatusPengajuan::SEDANG_DIBELANJAKAN->value,
            StatusPengajuan::DITOLAK_KEUANGAN->value,
        ];
        if (in_array($request->status, $financialStatuses, true)) {
            return response()->json([
                'status' => 'error',
                'message' => "Transisi status ke '{$request->status}' hanya dapat dilakukan melalui endpoint keputusan keuangan (/requests/{id}/keputusan-keuangan).",
            ], 422);
        }

        // Otorisasi transisi status via Policy transition terlebih dahulu
        $this->authorize('transition', [$req, $request->status]);

        $catatan = $request->note ?? $request->rejectionReason ?? $request->rejection_reason;
        $user = $request->user();
        $actorRole = $user ? $user->role : null;

        $req = WorkflowService::transition(
            $req,
            $request->status,
            $user,
            $catatan,
            $actorRole
        );


        $req->load(['details', 'activityLogs', 'penyelesaian']);

        return response()->json([
            'status' => 'success',
            'message' => "Status berhasil diperbarui ke {$req->status}.",
            'data' => $this->formatRequest($req),
        ]);
    }

    public function submitExpenseReport(Request $request, $id)
    {
        $req = ProcurementRequest::with(['details', 'activityLogs', 'penyelesaian'])->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $actual = (float)($request->actualSpent ?? $request->actual_spent ?? 0);
        $danaDiterima = (float)($req->dana_diterima > 0 ? $req->dana_diterima : ($req->disbursed_amount ?? 0));

        $refund = 0;
        $deficit = 0;

        if ($danaDiterima > $actual) {
            $refund = $danaDiterima - $actual;
        } elseif ($actual > $danaDiterima) {
            $deficit = $actual - $danaDiterima;
        }

        $receipts = [];
        if ($request->hasFile('receipts')) {
            $request->validate([
                'receipts' => 'required',
                'receipts.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);

            $files = $request->file('receipts');
            if (!is_array($files)) {
                $files = [$files];
            }

            $Y = now()->format('Y');
            $m = now()->format('m');
            $kode = preg_replace('/[^A-Za-z0-9_\-]/', '_', $req->id);

            foreach ($files as $file) {
                $receipts[] = $file->store("bon/{$Y}/{$m}/{$kode}", 'local');
            }
        } else {
            $receipts = $request->receiptImages ?? $request->receipt_images ?? [];
        }

        // Asdos WAJIB input bon fisik atau dokumen PDF
        if (empty($receipts) || (is_array($receipts) && count($receipts) === 0)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Wajib melampirkan foto bon atau dokumen PDF nota belanja fisik! Tanpa bukti bon, laporan tidak dapat diajukan.',
            ], 422);
        }

        // Validasi format MIME type & ukuran payload foto/PDF bon (maksimal ~3.5 MB / 5.000.000 karakter Base64)
        $maxBase64Length = 5000000;
        if (is_array($receipts)) {
            foreach ($receipts as $idx => $img) {
                if (is_string($img)) {
                    if (str_starts_with($img, 'data:')) {
                        if (!str_starts_with($img, 'data:image/') && !str_starts_with($img, 'data:application/pdf')) {
                            return response()->json([
                                'status' => 'error',
                                'message' => 'Format file nota tidak valid. Hanya berkas foto (JPG, PNG, WEBP) atau dokumen PDF yang didukung.',
                            ], 422);
                        }
                    }

                    if (strlen($img) > $maxBase64Length) {
                        return response()->json([
                            'status' => 'error',
                            'message' => 'Ukuran file nota ke-' . ($idx + 1) . ' melebihi ambang batas (maksimal 3.5 MB). Silakan unggah ulang.',
                        ], 422);
                    }
                }
            }
        }

        $alur = WorkflowService::resolveWorkflow($req);
        $user = $request->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthenticated.'], 401);
        }
        $isApplicant = ($req->pemohon_id && (string)$user->id === (string)$req->pemohon_id) || $user->name === $req->applicant;
        $isPemohonRole = $user->isAsdosKitchen() || $user->isStafUnit();
        $isKeuUmum = ($alur === 'B') && $user->isKeuanganUmum();
        if ((!$isApplicant || !$isPemohonRole) && !$isKeuUmum) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya pemohon atau Keuangan Umum yang berhak mengunggah berkas belanja.',
            ], 403);
        }

        if ($alur === 'B') {
            $req->actual_spent = $actual;
            $req->refund_amount = $refund;
            $req->deficit_amount = $deficit;
            $req->receipt_images = $receipts;
            if ($request->filled('note')) {
                $req->note = $request->note;
            }
            $req->save();

            ProcurementActivityLog::create([
                'procurement_request_id' => $req->id,
                'user_id' => $user->id,
                'actor_name' => $user->name,
                'actor_role' => $user->role,
                'action' => 'Unggah Bukti Belanja & Nota (SPJ)',
                'status_from' => $req->status,
                'status_to' => $req->status,
                'notes' => $request->note ?? 'Bukti nota belanja diunggah.',
                'created_at' => now(),
            ]);

            $req->load(['details', 'activityLogs', 'penyelesaian']);
            return response()->json([
                'status' => 'success',
                'message' => 'Bukti belanja Alur B berhasil disimpan.',
                'data' => $this->formatRequest($req),
            ]);
        }

        // Jika status masih DANA_DICAIRKAN (Alur A), transisikan dulu ke BARANG_DITERIMA sesuai FSM
        if ($req->status === StatusPengajuan::DANA_DICAIRKAN->value) {
            $req = WorkflowService::transition(
                $req,
                StatusPengajuan::BARANG_DITERIMA->value,
                $user,
                'Barang telah dibelanjakan dan diterima oleh Asdos.',
                $user->role
            );
        }

        $note = $request->note ?? ("Laporan belanja diajukan oleh Asdos. Total riil: Rp " . number_format($actual, 0, ',', '.'));

        $req = WorkflowService::transition(
            $req,
            StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value,
            $user,
            $note,
            $user->role,
            [
                'actual_spent' => $actual,
                'refund_amount' => $refund,
                'deficit_amount' => $deficit,
                'receipt_images' => $receipts,
            ]
        );


        $req->load(['details', 'activityLogs', 'penyelesaian']);

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan belanja (SPJ) berhasil disimpan.',
            'data' => $this->formatRequest($req),
        ]);
    }

    /**
     * Endpoint POST /api/kasbon/{id}/penyelesaian
     * {id} = id pengajuan (karena belum ada tabel kasbon terpisah)
     * Khusus Keuangan Kitchen (Alur A)
     */
    public function catatPenyelesaian(Request $request, $id)
    {
        $req = ProcurementRequest::with(['details', 'activityLogs', 'penyelesaian'])->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan kasbon tidak ditemukan.',
            ], 404);
        }

        // Khusus Alur A (Kitchen)
        if (WorkflowService::resolveWorkflow($req) !== 'A') {
            return response()->json([
                'status' => 'error',
                'message' => 'Penyelesaian kasbon hanya berlaku untuk pengadaan Kitchen (Alur A).',
            ], 422);
        }

        // Cek otorisasi peran Keuangan Kitchen
        $user = $request->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthenticated.'], 401);
        }

        if (!$user->isKeuanganKitchen()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Keuangan Kitchen yang berhak mencatat penyelesaian kasbon.',
            ], 403);
        }

        // Update actual_spent jika dikirim di payload
        if ($request->has('actualSpent') || $request->has('actual_spent')) {
            $req->actual_spent = (float)($request->actualSpent ?? $request->actual_spent);
            $req->save();
        }

        $danaDiterima = (float)($req->dana_diterima > 0 ? $req->dana_diterima : ($req->disbursed_amount ?? 0));
        $actualSpent = (float)($req->actual_spent ?? 0);
        $selisih = $actualSpent - $danaDiterima;

        if ($selisih == 0) {
            return response()->json([
                'status' => 'success',
                'message' => 'Selisih kasbon adalah nol. Pengajuan dapat langsung ditutup (SELESAI).',
                'data' => [
                    'selisih' => 0,
                    'jenis' => 'pas',
                    'request' => $this->formatRequest($req),
                ],
            ]);
        }

        $buktiPath = null;
        if ($selisih < 0) {
            // Asdos wajib menyetor sisa dana kasbon
            $jenis = 'setor';
            $nominal = abs($selisih);

            // Validasi bukti setor wajib diunggah (JPG/PNG/PDF, maks 5 MB)
            if ($request->hasFile('bukti_setor') || $request->hasFile('bukti')) {
                $file = $request->file('bukti_setor') ?? $request->file('bukti');
                $request->validate([
                    'bukti_setor' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
                    'bukti' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
                ]);
                $Y = now()->format('Y');
                $m = now()->format('m');
                $kode = preg_replace('/[^A-Za-z0-9_\-]/', '_', $req->id);
                $buktiPath = $file->store("bon/{$Y}/{$m}/{$kode}", 'local');
            } elseif ($request->filled('bukti_path') || $request->filled('buktiPath')) {
                $buktiPath = $request->bukti_path ?? $request->buktiPath;
            } else {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'bukti_setor' => ['Bukti setor sisa dana wajib diunggah (JPG/PNG/PDF, maks 5 MB).'],
                ]);
            }
        } else {
            // Asdos tombok -> jenis carry_over, kasbon_tujuan_id masih NULL
            $jenis = 'carry_over';
            $nominal = $selisih;
            $buktiPath = $request->bukti_path ?? $request->buktiPath ?? null;
        }

        $penyelesaian = KasbonPenyelesaian::create([
            'pengajuan_id' => $req->id,
            'jenis' => $jenis,
            'nominal' => $nominal,
            'bukti_path' => $buktiPath,
            'kasbon_tujuan_id' => null,
            'dicatat_oleh' => $user?->name ?? 'Siti Aminah, S.E. (Keuangan)',
            'tanggal' => now()->toDateString(),
        ]);

        if ($jenis === 'setor') {
            $req->refund_amount = $nominal;
            $req->deficit_amount = 0;
        } else {
            $req->deficit_amount = $nominal;
            $req->refund_amount = 0;
        }
        $req->save();

        ProcurementActivityLog::create([
            'procurement_request_id' => $req->id,
            'user_id' => $user->id,
            'actor_name' => $user->name,
            'actor_role' => $user->role,
            'action' => $jenis === 'setor' ? 'Penyelesaian Kasbon: Setor Sisa' : 'Penyelesaian Kasbon: Carry-Over Tombok',
            'status_from' => $req->status,
            'status_to' => $req->status,
            'notes' => $jenis === 'setor'
                ? "Sisa dana kasbon sebesar Rp " . number_format($nominal, 0, ',', '.') . " telah disetor oleh Asdos."
                : "Tombok kasbon Asdos sebesar Rp " . number_format($nominal, 0, ',', '.') . " dicatat sebagai carry-over ke kasbon berikutnya.",
        ]);

        $req->load(['details', 'activityLogs', 'penyelesaian']);

        return response()->json([
            'status' => 'success',
            'message' => 'Penyelesaian kasbon berhasil dicatat.',
            'data' => [
                'penyelesaian' => $penyelesaian,
                'request' => $this->formatRequest($req),
            ],
        ], 201);
    }

    public function activities($id)
    {
        $req = ProcurementRequest::riil()->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $this->authorize('view', $req);

        $logs = ProcurementActivityLog::where('procurement_request_id', $id)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $logs,
        ]);
    }


    protected function parseDate($str)
    {
        if (!$str) return null;
        $enStr = str_ireplace(
            ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
            ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            $str
        );
        try {
            return Carbon::parse($enStr);
        } catch (\Throwable $e) {
            return Carbon::today();
        }
    }

    public function kpis(Request $request)
    {
        $query = ProcurementRequest::riil();
        $this->applyRoleScope($query, $request->user());
        $requests = $query->get();

        $totalRequests = $requests->count();
        $totalCost = $requests->sum('price');
        $diajukan = $requests->where('status', StatusPengajuan::DIAJUKAN->value)->count();
        $diverifikasi = $requests->where('status', StatusPengajuan::DIVERIFIKASI_KOORD->value)->count();
        $disetujui = $requests->where('status', StatusPengajuan::DISETUJUI_KAPRODI->value)->count();
        $dicairkan = $requests->where('status', StatusPengajuan::DANA_DICAIRKAN->value)->count();
        $pembelian = $requests->where('status', StatusPengajuan::SEDANG_DIBELANJAKAN->value)->count();
        $barangDiterima = $requests->where('status', StatusPengajuan::BARANG_DITERIMA->value)->count();
        $lpj = $requests->where('status', StatusPengajuan::LAPORAN_BELANJA_DIAJUKAN->value)->count();
        $selesai = $requests->where('status', StatusPengajuan::SELESAI->value)->count();
        $ditolak = $requests->whereIn('status', [
            StatusPengajuan::DITOLAK_KOORD->value,
            StatusPengajuan::DITOLAK_KAPRODI->value,
            StatusPengajuan::DITOLAK_KEUANGAN->value,
        ])->count();

        $totalDisbursed = $requests->sum('disbursed_amount');
        $totalActualSpent = $requests->sum('actual_spent');
        $totalRefund = $requests->sum('refund_amount');
        $totalDeficit = $requests->sum('deficit_amount');

        return response()->json([
            'status' => 'success',
            'data' => [
                'totalRequests' => $totalRequests,
                'totalCost' => (float)$totalCost,
                'pendingKoordinator' => $diajukan,
                'pendingKaprodi' => $diverifikasi,
                'pendingDisbursement' => $disetujui,
                'fundsDisbursed' => $dicairkan,
                'inPurchase' => $pembelian,
                'received' => $barangDiterima,
                'pendingSpjReview' => $lpj,
                'completed' => $selesai,
                'rejected' => $ditolak,
                'financials' => [
                    'totalDisbursed' => (float)$totalDisbursed,
                    'totalActualSpent' => (float)$totalActualSpent,
                    'totalRefund' => (float)$totalRefund,
                    'totalDeficit' => (float)$totalDeficit,
                ],
            ],
        ]);
    }

    public function keputusanKeuangan(Request $request, $id)
    {
        $req = ProcurementRequest::with(['details', 'activityLogs', 'penyelesaian'])->find($id);
        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $user = $request->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthenticated.'], 401);
        }

        if ($user->isSuperAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Super Admin tidak berwenang memutuskan keuangan.',
            ], 403);
        }

        $alur = WorkflowService::resolveWorkflow($req);
        if ($alur === 'A') {
            if (!$user->isKeuanganKitchen()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Hanya Keuangan Kitchen yang berhak memproses keputusan keuangan Alur A.',
                ], 403);
            }
        } else {
            if (!$user->isKeuanganUmum()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Hanya Keuangan Umum yang berhak memproses keputusan keuangan Alur B.',
                ], 403);
            }
        }

        $actingRole = $user->role;
        $fVal = is_numeric($request->input('faktor_f')) ? (float)$request->input('faktor_f') : -1.0;
        $validF = [1.0, 0.5, 0.25, 0.0];
        if (!in_array($fVal, $validF, true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Nilai faktor f tidak valid. Pilihan yang sah hanya 1, 0.5, 0.25, atau 0.',
                'errors' => [
                    'faktor_f' => ['Nilai faktor f tidak valid. Pilihan yang sah hanya 1, 0.5, 0.25, atau 0.']
                ]
            ], 422);
        }

        $buktiPath = $req->bukti_transfer;

        if ($request->hasFile('bukti_transfer') || $request->hasFile('bukti')) {
            $request->validate([
                'bukti_transfer' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
                'bukti' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            ]);
            $file = $request->file('bukti_transfer') ?? $request->file('bukti');
            $Y = now()->format('Y');
            $m = now()->format('m');
            $kode = preg_replace('/[^A-Za-z0-9_\-]/', '_', $req->id);
            $buktiPath = $file->store("transfer/{$Y}/{$m}/{$kode}", 'local');
            $req->bukti_transfer = $buktiPath;
            $req->save();
        } elseif ($request->filled('bukti_transfer_path')) {
            $buktiPath = $request->input('bukti_transfer_path');
            $req->bukti_transfer = $buktiPath;
            $req->save();
        }

        // B5: Bukti transfer wajib diisi saat faktor f > 0
        if ($fVal > 0 && empty($buktiPath)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bukti transfer pencairan dana wajib diunggah (JPG/PNG/PDF, maks 5 MB).',
            ], 422);
        }

        $updatedReq = WorkflowService::processKeputusanKeuangan(
            $req,
            $request->input('faktor_f'),
            $request->input('catatan_keuangan') ?? $request->input('note'),
            $request->has('nominal_transfer') ? (float)$request->input('nominal_transfer') : null,
            $user,
            $actingRole
        );

        if ($buktiPath && $updatedReq->bukti_transfer !== $buktiPath) {
            $updatedReq->bukti_transfer = $buktiPath;
            $updatedReq->save();
        }

        $updatedReq->load(['details', 'activityLogs', 'penyelesaian']);

        return response()->json([
            'status' => 'success',
            'message' => 'Keputusan Keuangan berhasil diproses.',
            'data' => $this->formatRequest($updatedReq),
        ]);
    }

    /**
     * Terapkan scope filter berdasarkan otorisasi peran user sesuai Policy
     */
    protected function applyRoleScope($query, ?User $user)
    {
        if (!$user) {
            return $query;
        }

        if ($user->isSuperAdmin()) {
            return $query;
        }

        if ($user->isKeuanganKitchen() || $user->isKaprodi() || $user->isKoordinatorLab()) {
            return $query->where(function ($q) {
                $q->where('alur', 'A')
                  ->orWhere(function ($sub) {
                      $sub->whereNull('alur')->where('category', 'Bahan Praktik Masak');
                  });
            });
        }

        if ($user->isKeuanganUmum()) {
            return $query->where('alur', 'B');
        }

        if ($user->isKoordinatorUnit()) {
            $unitId = $user->unit_id ?? $user->getUnitSlugAlurB();
            return $query->where('alur', 'B')
                ->where(function ($q) use ($unitId) {
                    if ($unitId) {
                        $q->where('unit_id', $unitId)
                          ->orWhereRaw('UPPER(unit_kerja) LIKE ?', ["%{$unitId}%"])
                          ->orWhereRaw('UPPER(department) LIKE ?', ["%{$unitId}%"]);
                    }
                });
        }

        // Default: Pemohon (Asdos Kitchen / Staf Unit) hanya melihat miliknya sendiri berbasis pemohon_id
        return $query->where('pemohon_id', (string)$user->id);
    }

    /**
     * GET /api/requests/{id}/berkas/{berkasId}
     * Otorisasi menggunakan Policy view
     */
    public function downloadBerkas(Request $request, $id, $berkasId)
    {
        $req = ProcurementRequest::with(['penyelesaian'])->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $this->authorize('view', $req);

        $targetPath = null;
        $rawBase64 = null;

        $receipts = is_array($req->receipt_images) ? $req->receipt_images : [];

        // 1. Cek numeric index pada receipt_images
        if (is_numeric($berkasId) && isset($receipts[(int)$berkasId])) {
            $candidate = $receipts[(int)$berkasId];
            if (str_starts_with($candidate, 'data:')) {
                $rawBase64 = $candidate;
            } else {
                $targetPath = $candidate;
            }
        }

        // 2. Cek apakah berkasId cocok dengan string / basename receipt_images
        if (!$targetPath && !$rawBase64) {
            foreach ($receipts as $r) {
                if (is_string($r)) {
                    if (basename($r) === $berkasId || $r === $berkasId) {
                        if (str_starts_with($r, 'data:')) {
                            $rawBase64 = $r;
                        } else {
                            $targetPath = $r;
                        }
                        break;
                    }
                }
            }
        }

        // 3. Cek di penyelesaian kasbon (bukti_path)
        if (!$targetPath && !$rawBase64 && $req->penyelesaian) {
            foreach ($req->penyelesaian as $p) {
                if ($p->bukti_path) {
                    if ($berkasId === 'bukti_setor' || $berkasId === 'bukti' || (string)$p->id === (string)$berkasId || basename($p->bukti_path) === $berkasId || $p->bukti_path === $berkasId) {
                        $targetPath = $p->bukti_path;
                        break;
                    }
                }
            }
        }

        // 3b. Cek bukti_transfer
        if (!$targetPath && !$rawBase64 && $req->bukti_transfer) {
            if ($berkasId === 'bukti_transfer' || $berkasId === 'transfer' || basename($req->bukti_transfer) === $berkasId || $req->bukti_transfer === $berkasId) {
                $targetPath = $req->bukti_transfer;
            }
        }

        // 4. Jika masih belum ditemukan, cek langsung folder bon request di disk local
        if (!$targetPath && !$rawBase64) {
            $kode = preg_replace('/[^A-Za-z0-9_\-]/', '_', $req->id);
            $allFiles = Storage::disk('local')->allFiles("bon");
            foreach ($allFiles as $f) {
                if (basename($f) === $berkasId && str_contains($f, $kode)) {
                    $targetPath = $f;
                    break;
                }
            }
        }

        if ($rawBase64) {
            [$header, $data] = explode(',', $rawBase64, 2);
            preg_match('/data:(.*?);base64/', $header, $matches);
            $mime = $matches[1] ?? 'image/jpeg';
            return response(base64_decode($data))->header('Content-Type', $mime);
        }

        if ($targetPath && Storage::disk('local')->exists($targetPath)) {
            return Storage::disk('local')->response($targetPath);
        }

        if ($targetPath && Storage::disk('public')->exists($targetPath)) {
            return Storage::disk('public')->response($targetPath);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Berkas tidak ditemukan.',
        ], 404);
    }
}
