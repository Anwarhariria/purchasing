<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProcurementRequest;
use App\Models\RequestDetail;
use App\Models\Notification;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ProcurementRequestController extends Controller
{
    protected function formatRequest(ProcurementRequest $req)
    {
        return [
            'id' => $req->id,
            'item' => $req->item,
            'category' => $req->category,
            'prodi' => $req->prodi,
            'semester' => (int)$req->semester,
            'course' => $req->course,
            'menu' => $req->menu,
            'qty' => (int)$req->qty,
            'unit' => $req->unit,
            'price' => (float)$req->price,
            'urgency' => $req->urgency,
            'academicImportance' => $req->academic_importance,
            'academic_importance' => $req->academic_importance,
            'applicant' => $req->applicant,
            'department' => $req->department,
            'date' => $req->date,
            'needBy' => $req->need_by,
            'need_by' => $req->need_by,
            'deadline' => $req->deadline,
            'purpose' => $req->purpose,
            'status' => $req->status,
            'note' => $req->note,
            'disbursedAmount' => (float)($req->disbursed_amount ?? 0),
            'disbursed_amount' => (float)($req->disbursed_amount ?? 0),
            'actualSpent' => (float)($req->actual_spent ?? 0),
            'actual_spent' => (float)($req->actual_spent ?? 0),
            'refundAmount' => (float)($req->refund_amount ?? 0),
            'refund_amount' => (float)($req->refund_amount ?? 0),
            'deficitAmount' => (float)($req->deficit_amount ?? 0),
            'deficit_amount' => (float)($req->deficit_amount ?? 0),
            'reimbursementStatus' => $req->reimbursement_status ?? 'Belum Diajukan',
            'reimbursement_status' => $req->reimbursement_status ?? 'Belum Diajukan',
            'receiptImages' => $req->receipt_images ?? [],
            'receipt_images' => $req->receipt_images ?? [],
            'details' => $req->details->map(function ($d) {
                return [
                    'id' => $d->code_id ?? ('D-' . $d->id),
                    'name' => $d->name,
                    'qty' => (float)$d->qty,
                    'unit' => $d->unit,
                    'price' => (float)$d->price,
                    'neededQty' => (float)($d->needed_qty ?? $d->qty),
                    'needed_qty' => (float)($d->needed_qty ?? $d->qty),
                    'stockInLab' => (float)($d->stock_in_lab ?? 0),
                    'stock_in_lab' => (float)($d->stock_in_lab ?? 0),
                ];
            }),
            'created_at' => $req->created_at,
            'updated_at' => $req->updated_at,
        ];
    }

    public function index(Request $request)
    {
        $query = ProcurementRequest::with('details')->orderBy('created_at', 'desc');

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

        $requests = $query->get()->map(fn($r) => $this->formatRequest($r));

        return response()->json([
            'status' => 'success',
            'data' => $requests,
        ]);
    }

    public function show($id)
    {
        $req = ProcurementRequest::with('details')->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->formatRequest($req),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'item' => 'required|string',
            'applicant' => 'required|string',
        ]);

        $id = $request->id;
        if (!$id) {
            $count = ProcurementRequest::count() + 1;
            $id = sprintf('PR-2026-%03d', $count);
        }

        $req = ProcurementRequest::create([
            'id' => $id,
            'item' => $request->item,
            'category' => $request->category ?? 'Bahan Praktik Masak',
            'prodi' => $request->prodi,
            'semester' => $request->semester,
            'course' => $request->course,
            'menu' => $request->menu ?? $request->item,
            'qty' => $request->qty ?? 1,
            'unit' => $request->unit ?? 'items',
            'price' => $request->price ?? 0,
            'urgency' => $request->urgency ?? 'Normal',
            'academic_importance' => $request->academicImportance ?? $request->academic_importance ?? 'Standar',
            'applicant' => $request->applicant,
            'department' => $request->department ?? 'Lab Masak',
            'date' => $request->date ?? Carbon::now()->isoFormat('DD MMM YYYY'),
            'need_by' => $request->needBy ?? $request->need_by ?? Carbon::now()->addDays(5)->format('Y-m-d'),
            'deadline' => $request->deadline,
            'purpose' => $request->purpose,
            'status' => 'Diajukan',
            'note' => $request->note,
            'disbursed_amount' => 0,
            'actual_spent' => 0,
            'refund_amount' => 0,
            'deficit_amount' => 0,
            'reimbursement_status' => 'Belum Diajukan',
        ]);

        // Insert details
        if ($request->has('details') && is_array($request->details)) {
            $dIdx = 1;
            foreach ($request->details as $d) {
                RequestDetail::create([
                    'code_id' => $d['id'] ?? ('D-' . sprintf('%02d', $dIdx++)),
                    'request_id' => $req->id,
                    'name' => $d['name'],
                    'qty' => $d['qty'] ?? 1,
                    'needed_qty' => $d['neededQty'] ?? $d['needed_qty'] ?? $d['qty'] ?? 1,
                    'stock_in_lab' => $d['stockInLab'] ?? $d['stock_in_lab'] ?? 0,
                    'unit' => $d['unit'] ?? 'item',
                    'price' => $d['price'] ?? 0,
                ]);
            }
        }

        // Create notification for Koordinator
        $notifCount = Notification::count() + 1;
        Notification::create([
            'id' => sprintf('NOTIF-%03d', $notifCount),
            'title' => "{$req->id} Menunggu Verifikasi Qty Koordinator",
            'desc' => "Pengajuan {$req->item} dari {$req->applicant} siap ditinjau standarnya.",
            'time' => 'Baru saja',
            'target_role' => 'Koordinator',
            'request_id' => $req->id,
            'read' => false,
        ]);

        $req->load('details');

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

        $fields = [
            'item', 'category', 'prodi', 'semester', 'course', 'menu',
            'qty', 'unit', 'price', 'urgency', 'purpose', 'note'
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

        if ($request->has('status')) {
            $req->status = $request->status;
        }

        $req->save();

        // Update details if provided
        if ($request->has('details') && is_array($request->details)) {
            RequestDetail::where('request_id', $req->id)->delete();
            $dIdx = 1;
            foreach ($request->details as $d) {
                RequestDetail::create([
                    'code_id' => $d['id'] ?? ('D-' . sprintf('%02d', $dIdx++)),
                    'request_id' => $req->id,
                    'name' => $d['name'],
                    'qty' => $d['qty'] ?? 1,
                    'needed_qty' => $d['neededQty'] ?? $d['needed_qty'] ?? $d['qty'] ?? 1,
                    'stock_in_lab' => $d['stockInLab'] ?? $d['stock_in_lab'] ?? 0,
                    'unit' => $d['unit'] ?? 'item',
                    'price' => $d['price'] ?? 0,
                ]);
            }
        }

        $req->load('details');

        return response()->json([
            'status' => 'success',
            'message' => 'Pengajuan berhasil diperbarui.',
            'data' => $this->formatRequest($req),
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $req = ProcurementRequest::with('details')->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $request->validate([
            'status' => 'required|string',
        ]);

        $prevStatus = $req->status;
        $req->status = $request->status;

        if ($request->has('note')) {
            $req->note = $request->note;
        }

        $req->save();

        // Create notification for target roles
        $targetRole = 'Semua';
        $title = "{$req->id} Status Diperbarui: {$req->status}";
        $desc = "Status pengajuan {$req->item} telah diubah menjadi {$req->status}.";

        if ($req->status === 'Diverifikasi Koordinator') {
            $targetRole = 'Kaprodi';
            $title = "{$req->id} Telah Diverifikasi Koordinator";
            $desc = "Bahan Praktik {$req->item} telah diverifikasi Koordinator & siap ditinjau Kaprodi.";
        } elseif ($req->status === 'Disetujui Kaprodi') {
            $targetRole = 'Bagian Keuangan';
            $title = "{$req->id} Disetujui Kaprodi & Siap Dicairkan";
            $desc = "Kaprodi telah menyetujui pengajuan {$req->item}. Menunggu transfer dana dari Keuangan.";
        } elseif ($req->status === 'Dana Dicairkan') {
            $targetRole = 'Staf / Asdos';
            $title = "{$req->id} Dana Telah Dicairkan";
            $desc = "Dana pengajuan {$req->item} telah ditransfer. Silakan belanja bahan praktik.";
        }

        $notifCount = Notification::count() + 1;
        Notification::create([
            'id' => sprintf('NOTIF-%03d', $notifCount),
            'title' => $title,
            'desc' => $desc,
            'time' => 'Baru saja',
            'target_role' => $targetRole,
            'request_id' => $req->id,
            'read' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Status berhasil diperbarui ke {$req->status}.",
            'data' => $this->formatRequest($req),
        ]);
    }

    public function disburseFunds(Request $request, $id)
    {
        $req = ProcurementRequest::with('details')->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $amount = (float)($request->amount ?? $request->disbursedAmount ?? $request->disbursed_amount ?? $req->price);
        $note = $request->note ?? "Dana sebesar Rp " . number_format($amount, 0, ',', '.') . " telah ditransfer ke Asdos.";

        $req->disbursed_amount = $amount;
        $req->status = 'Dana Dicairkan';
        $req->note = $note;
        $req->save();

        $notifCount = Notification::count() + 1;
        Notification::create([
            'id' => sprintf('NOTIF-%03d', $notifCount),
            'title' => "{$req->id} Dana Telah Dicairkan",
            'desc' => "Dana Rp " . number_format($amount, 0, ',', '.') . " telah ditransfer ke Asdos.",
            'time' => 'Baru saja',
            'target_role' => 'Staf / Asdos',
            'request_id' => $req->id,
            'read' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Pencairan dana berhasil dicatat.',
            'data' => $this->formatRequest($req),
        ]);
    }

    public function submitExpenseReport(Request $request, $id)
    {
        $req = ProcurementRequest::with('details')->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $actual = (float)($request->actualSpent ?? $request->actual_spent ?? 0);
        $disbursed = (float)($req->disbursed_amount ?? 0);

        $refund = 0;
        $deficit = 0;
        $reimbStatus = 'Tidak Ada Selisih';

        if ($disbursed > $actual) {
            $refund = $disbursed - $actual;
            $reimbStatus = 'Tidak Ada Selisih';
        } elseif ($actual > $disbursed) {
            $deficit = $actual - $disbursed;
            $reimbStatus = 'Menunggu Penggantian';
        }

        $receipts = $request->receiptImages ?? $request->receipt_images ?? [];

        // Asdos WAJIB input bon fisik
        if (empty($receipts) || (is_array($receipts) && count($receipts) === 0)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Wajib melampirkan foto bon / nota belanja fisik! Tanpa foto bon, laporan tidak dapat diajukan.',
            ], 422);
        }

        $req->actual_spent = $actual;
        $req->refund_amount = $refund;
        $req->deficit_amount = $deficit;
        $req->reimbursement_status = $reimbStatus;
        $req->receipt_images = $receipts;
        $req->status = 'Laporan Belanja Diajukan';
        $req->note = $request->note ?? "Laporan belanja diajukan oleh Asdos. Total riil: Rp " . number_format($actual, 0, ',', '.');
        $req->save();

        $notifCount = Notification::count() + 1;
        Notification::create([
            'id' => sprintf('NOTIF-%03d', $notifCount),
            'title' => "{$req->id} Laporan Belanja Diajukan Asdos",
            'desc' => "Asdos telah mengunggah bon belanja ({$req->item}). Selisih: " . ($deficit > 0 ? "Kurang Rp " . number_format($deficit, 0, ',', '.') : "Kembalian Rp " . number_format($refund, 0, ',', '.')),
            'time' => 'Baru saja',
            'target_role' => 'Bagian Keuangan',
            'request_id' => $req->id,
            'read' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan belanja (SPJ) berhasil disimpan.',
            'data' => $this->formatRequest($req),
        ]);
    }

    public function reimburseDeficit(Request $request, $id)
    {
        $req = ProcurementRequest::with('details')->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $req->reimbursement_status = 'Telah Diganti';
        $req->status = 'Selesai';
        $req->note = $request->note ?? "Kekurangan dana Rp " . number_format($req->deficit_amount, 0, ',', '.') . " telah diganti/ditransfer oleh Keuangan ke Asdos. Transaksi resmi ditutup.";
        $req->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Penggantian selisih selesai dicatat.',
            'data' => $this->formatRequest($req),
        ]);
    }

    public function destroy($id)
    {
        $req = ProcurementRequest::find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengajuan tidak ditemukan.',
            ], 404);
        }

        $req->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Pengajuan berhasil dihapus.',
        ]);
    }

    public function sawRanking()
    {
        $items = ProcurementRequest::with('details')->get();

        if ($items->isEmpty()) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        $today = Carbon::today();

        // Calculate days left helper
        $getDaysLeft = function ($needBy) use ($today) {
            if (!$needBy) return 5;
            $d = Carbon::parse($needBy);
            $diff = $today->diffInDays($d, false);
            return max(1, (int)$diff);
        };

        $minDays = 999999;
        $minPrice = 999999999;

        foreach ($items as $it) {
            $days = $getDaysLeft($it->need_by);
            if ($days < $minDays) $minDays = $days;
            if ($it->price < $minPrice) $minPrice = (float)$it->price;
        }

        if ($minDays <= 0) $minDays = 1;
        if ($minPrice <= 0) $minPrice = 1;

        $ranked = $items->map(function ($it) use ($getDaysLeft, $minDays, $minPrice) {
            $c1 = ($it->urgency === 'Mendesak') ? 1.0 : 0.5;
            $c2 = ($it->academic_importance === 'Tinggi') ? 1.0 : (($it->academic_importance === 'Sedang') ? 0.7 : 0.4);
            $itemDays = $getDaysLeft($it->need_by);
            $c3 = $minDays / $itemDays;
            $c4 = $minPrice / max(1, (float)$it->price);

            $sawScore = round(($c1 * 0.35 + $c2 * 0.3 + $c3 * 0.2 + $c4 * 0.15), 3);

            $formatted = $this->formatRequest($it);
            $formatted['sawScore'] = $sawScore;
            $formatted['daysRemaining'] = $itemDays;

            return $formatted;
        })->sortByDesc('sawScore')->values();

        return response()->json([
            'status' => 'success',
            'data' => $ranked,
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

    public function fifoRanking()
    {
        $items = ProcurementRequest::with('details')->get();

        if ($items->isEmpty()) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        $now = Carbon::today();

        // Sort by date ASC, then id ASC
        $sorted = $items->sort(function ($a, $b) {
            $parsedA = $this->parseDate($a->date);
            $parsedB = $this->parseDate($b->date);
            $timeA = $parsedA ? $parsedA->timestamp : 0;
            $timeB = $parsedB ? $parsedB->timestamp : 0;
            if ($timeA !== $timeB) {
                return $timeA <=> $timeB;
            }
            return strcmp($a->id, $b->id);
        })->values();

        $ranked = $sorted->map(function ($it, $index) use ($now) {
            $submitTime = $this->parseDate($it->date) ?? $now;
            $waitingDays = max(0, $submitTime->diffInDays($now, false));
            $fifoQueueNumber = $index + 1;
            $fifoPriorityLabel = $fifoQueueNumber === 1
                ? 'Antrean Utama #1 (Pertama Masuk)'
                : ($fifoQueueNumber <= 3
                    ? "Antrean Prioritas #{$fifoQueueNumber}"
                    : "Antrean #{$fifoQueueNumber}");

            $formatted = $this->formatRequest($it);
            $formatted['fifoQueueNumber'] = $fifoQueueNumber;
            $formatted['waitingDays'] = (int)$waitingDays;
            $formatted['fifoPriorityLabel'] = $fifoPriorityLabel;

            return $formatted;
        });

        return response()->json([
            'status' => 'success',
            'data' => $ranked,
        ]);
    }

    public function kpis()
    {
        $requests = ProcurementRequest::all();

        $totalRequests = $requests->count();
        $totalCost = $requests->sum('price');
        $diajukan = $requests->where('status', 'Diajukan')->count();
        $diverifikasi = $requests->where('status', 'Diverifikasi Koordinator')->count();
        $disetujui = $requests->where('status', 'Disetujui Kaprodi')->count();
        $dicairkan = $requests->where('status', 'Dana Dicairkan')->count();
        $pembelian = $requests->where('status', 'Proses Pembelian')->count();
        $lpj = $requests->where('status', 'Laporan Belanja Diajukan')->count();
        $selesai = $requests->where('status', 'Selesai')->count();

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
                'pendingSpjReview' => $lpj,
                'completed' => $selesai,
                'financials' => [
                    'totalDisbursed' => (float)$totalDisbursed,
                    'totalActualSpent' => (float)$totalActualSpent,
                    'totalRefund' => (float)$totalRefund,
                    'totalDeficit' => (float)$totalDeficit,
                ],
            ],
        ]);
    }
}
