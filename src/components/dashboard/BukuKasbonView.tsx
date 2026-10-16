import { useState, useMemo, useEffect } from "react";
import { SpakeApi } from "@/lib/api-client";
import {
  Wallet,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck,
  Search,
  Download,
  Filter,
  DollarSign,
  UploadCloud,
  X,
  CreditCard,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import {
  type RequestItem,
  type Role,
  type Status,
  type KasbonAsdosSummary,
  type KasbonTransactionDetail,
  type UserAccount,
  isPemohon as checkPemohon,
  isKeuangan,
} from "@/types/procurement";

interface BukuKasbonViewProps {
  requests: RequestItem[];
  role: Role;
  currentUser?: UserAccount | null;
  notify: (msg: string) => void;
  onUpdateStatus?: (
    id: string,
    newStatus: Status,
    notes?: string,
    extra?: Partial<RequestItem>,
  ) => void;
}

interface StatCardProps {
  label: string;
  value: number;
  tone?: "normal" | "amber" | "rose";
}

function StatCard({ label, value, tone = "normal" }: StatCardProps) {
  let valueColor = "text-slate-900 dark:text-white";
  if (value > 0) {
    if (tone === "amber") {
      valueColor = "text-amber-600 dark:text-amber-400";
    } else if (tone === "rose") {
      valueColor = "text-rose-600 dark:text-rose-400";
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
      <span className="text-[13px] sm:text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className={`mt-2 text-2xl sm:text-[26px] font-bold tracking-tight ${valueColor}`}>
        {money(value)}
      </div>
    </div>
  );
}

export function BukuKasbonView({
  requests,
  role,
  currentUser,
  notify,
  onUpdateStatus,
}: BukuKasbonViewProps) {
  const isPemohon = checkPemohon(role);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Semua Status");
  const [selectedAsdosDetail, setSelectedAsdosDetail] = useState<string | null>(
    isPemohon && currentUser ? currentUser.name : null,
  );
  const [settlementModalAsdos, setSettlementModalAsdos] = useState<KasbonAsdosSummary | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<string>("Transfer Rekening Kas Kampus");
  const [settleRefNo, setSettleRefNo] = useState<string>("");

  // Ambil hanya pengajuan Alur A (Kitchen/Praktikum) yang memiliki data keuangan
  const kitchenRequests = useMemo(() => {
    return requests.filter((r) => !r.alur || r.alur === "A");
  }, [requests]);

  // Daftar Asdos aktif dari database/API
  const [activeAsdosUsers, setActiveAsdosUsers] = useState<string[]>([]);

  useEffect(() => {
    SpakeApi.getUsers()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          const names = (res.data as UserAccount[])
            .filter((u) => u.role === "Asdos Kitchen" && u.status === "Aktif")
            .map((u) => u.name);
          setActiveAsdosUsers(names);
        }
      })
      .catch(() => {});
  }, []);

  // Daftar nama unik Asdos dari data pengajuan dan akun Asdos aktif
  const asdosList = useMemo(() => {
    if (isPemohon && currentUser) {
      return [currentUser.name];
    }
    const fromRequests = Array.from(
      new Set(kitchenRequests.map((r) => r.applicant).filter(Boolean)),
    );
    const combined = Array.from(new Set([...activeAsdosUsers, ...fromRequests]));
    return combined.length > 0 ? combined : ["Aura Maharani (Asdos Kitchen)"];
  }, [kitchenRequests, isPemohon, currentUser, activeAsdosUsers]);

  // Agregasi Ringkasan per Asdos (Real-time computed projection)
  const kasbonSummaries: KasbonAsdosSummary[] = useMemo(() => {
    return asdosList.map((name) => {
      const userRequests = kitchenRequests.filter((r) => r.applicant === name);

      let totalReceived = 0;
      let totalSpent = 0;
      let refundRemaining = 0;
      let deficitCarryOver = 0;
      let count = 0;

      userRequests.forEach((r) => {
        const received = r.danaDiterima || r.nominalTransfer || 0;
        const spent = r.actualSpent || 0;

        if (received > 0 || spent > 0) {
          count++;
          totalReceived += received;
          totalSpent += spent;

          const isCarryOverSettled = r.penyelesaian?.some((p) =>
            Boolean(p.kasbonTujuanId || p.kasbon_tujuan_id),
          );

          if (r.status === "SELESAI") {
            // Jika sudah selesai dan belum dibawa ke kasbon berikutnya, catat sebagai carry-over
            if (r.deficitAmount && !isCarryOverSettled) {
              deficitCarryOver += r.deficitAmount;
            }
          } else {
            if (r.refundAmount && r.refundAmount > 0 && !r.buktiSetorUrl) {
              refundRemaining += r.refundAmount;
            }
            if (r.deficitAmount && r.deficitAmount > 0 && !isCarryOverSettled) {
              deficitCarryOver += r.deficitAmount;
            }
          }
        }
      });

      let status: KasbonAsdosSummary["status"] = "Lunas";
      if (refundRemaining > 0) {
        status = "Menunggu Setoran";
      } else if (deficitCarryOver > 0) {
        status = "Carry-Over Berikutnya";
      }

      return {
        asdosName: name,
        totalReceived,
        totalSpent,
        refundRemaining,
        deficitCarryOver,
        status,
        transactionCount: count,
      };
    });
  }, [asdosList, kitchenRequests]);

  // Filter list
  const filteredSummaries = useMemo(() => {
    return kasbonSummaries.filter((s) => {
      const matchesSearch = s.asdosName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "Semua Status" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [kasbonSummaries, searchTerm, statusFilter]);

  // Total Keseluruhan Metrik
  const grandTotal = useMemo(() => {
    return kasbonSummaries.reduce(
      (acc, s) => {
        acc.received += s.totalReceived;
        acc.spent += s.totalSpent;
        acc.refund += s.refundRemaining;
        acc.deficit += s.deficitCarryOver;
        return acc;
      },
      { received: 0, spent: 0, refund: 0, deficit: 0 },
    );
  }, [kasbonSummaries]);

  // Riwayat Transaksi per Asdos terpilih
  const selectedAsdosTransactions: KasbonTransactionDetail[] = useMemo(() => {
    if (!selectedAsdosDetail) return [];
    const userRequests = kitchenRequests.filter((r) => r.applicant === selectedAsdosDetail);

    const txs: KasbonTransactionDetail[] = userRequests.map((r) => {
      const received = r.danaDiterima || r.nominalTransfer || 0;
      const spent = r.actualSpent || 0;
      const diff = received - spent;

      let txStatus: KasbonTransactionDetail["status"] = "Lunas";
      const isCarryOverSettled = r.penyelesaian?.some((p) =>
        Boolean(p.kasbonTujuanId || p.kasbon_tujuan_id),
      );
      if (
        r.status === "SEDANG_DIBELANJAKAN" ||
        r.status === "DANA_DICAIRKAN" ||
        r.status === "BARANG_DITERIMA"
      ) {
        txStatus = "Proses Belanja";
      } else if (diff > 0 && !r.buktiSetorUrl) {
        txStatus = "Menunggu Setoran";
      } else if (diff < 0 && !isCarryOverSettled) {
        txStatus = "Carry-Over Berikutnya";
      }

      return {
        id: `TX-${r.id}`,
        requestId: r.id,
        asdosName: r.applicant,
        menuItem: r.item,
        date: r.date,
        danaDiterima: received,
        actualSpent: spent,
        difference: diff,
        status: txStatus,
        receiptImages: r.receiptImages,
        settlementProof: r.buktiSetorUrl,
        settledAt: r.status === "SELESAI" ? "Tervalidasi" : undefined,
        notes: r.note,
      };
    });

    return txs;
  }, [selectedAsdosDetail, kitchenRequests]);

  function handleConfirmSettlement() {
    if (!settlementModalAsdos) return;
    if (settleAmount <= 0) {
      notify("Nominal setoran harus lebih dari Rp 0!");
      return;
    }

    notify(
      `Setoran kembalian sebesar ${money(
        settleAmount,
      )} dari ${settlementModalAsdos.asdosName} berhasil dicatat via ${settleMethod}. Transaksi kasbon diperbarui!`,
    );
    setSettlementModalAsdos(null);
    setSettleAmount(0);
    setSettleRefNo("");
  }

  return (
    <div className="space-y-6">
      {/* HEADER & FORMULA BANNER */}
      <div className="rounded-2xl border border-rose-200/60 bg-gradient-to-r from-rose-50/80 via-amber-50/50 to-orange-50/60 p-5 dark:border-rose-900/40 dark:from-rose-950/20 dark:via-amber-950/10 dark:to-orange-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-600/10 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">
              <Wallet className="h-3.5 w-3.5" /> Modul Buku Kasbon Asdos (Alur A Kitchen)
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {isPemohon && currentUser
                ? `Buku Kasbon Pribadi: ${currentUser.name}`
                : "Buku Kasbon & Pelunasan Tombok Asdos"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                notify("Mengekspor Buku Kasbon Asdos ke format Excel (.xlsx)...");
              }}
              className="gap-2 border-slate-300 bg-white shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              Ekspor Buku Kasbon
            </Button>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total kasbon ditransfer" value={grandTotal.received} />
        <StatCard label="Total belanja riil (bon)" value={grandTotal.spent} />
        <StatCard label="Sisa kasbon belum disetor" value={grandTotal.refund} tone="amber" />
        <StatCard
          label="Tombok dibawa ke kasbon berikutnya"
          value={grandTotal.deficit}
          tone="rose"
        />
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama Asisten Dosen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors focus:border-rose-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="Semua Status">Semua Status Kasbon</option>
            <option value="Menunggu Setoran">Menunggu Setoran Kembalian</option>
            <option value="Carry-Over Berikutnya">Carry-Over Tombok</option>
            <option value="Lunas">Lunas (Saldo Rp 0)</option>
          </select>
        </div>
      </div>

      {/* TABEL BUKU KASBON PER ASDOS */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800/80 dark:bg-slate-900/80 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">
            Buku Kasbon Asdos (Rekapitulasi Akumulatif)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {filteredSummaries.length} Asisten Dosen Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50">
              <tr>
                <th className="px-5 py-3.5">Asisten Dosen (Kitchen)</th>
                <th className="px-4 py-3.5 text-right">Dana Diterima (Rp)</th>
                <th className="px-4 py-3.5 text-right">Belanja Riil (Rp)</th>
                <th className="px-4 py-3.5 text-right">Sisa Kas Belum Disetor</th>
                <th className="px-4 py-3.5 text-right">Tombok Carry-Over</th>
                <th className="px-4 py-3.5 text-center">Status Kasbon</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSummaries.map((summary) => (
                <tr
                  key={summary.asdosName}
                  className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                >
                  <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center text-xs">
                        {summary.asdosName.charAt(0)}
                      </div>
                      <div>
                        <div>{summary.asdosName}</div>
                        <div className="text-xs font-normal text-slate-500">
                          {summary.transactionCount} Transaksi Kasbon
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                    {money(summary.totalReceived)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                    {money(summary.totalSpent)}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-amber-600 dark:text-amber-400">
                    {summary.refundRemaining > 0 ? money(summary.refundRemaining) : "—"}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-rose-600 dark:text-rose-400">
                    {summary.deficitCarryOver > 0 ? money(summary.deficitCarryOver) : "—"}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {summary.status === "Menunggu Setoran" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" /> Menunggu Setoran
                      </span>
                    )}
                    {summary.status === "Carry-Over Berikutnya" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                        <ArrowUpRight className="h-3 w-3" /> Tombok Carry-Over
                      </span>
                    )}
                    {summary.status === "Lunas" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Saldo Bersih (Lunas)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAsdosDetail(summary.asdosName)}
                        className="h-8 gap-1.5 text-xs text-slate-700 dark:text-slate-200"
                      >
                        <History className="h-3.5 w-3.5 text-slate-500" />
                        Riwayat
                      </Button>

                      {(isKeuangan(role) || role === "Super Admin") &&
                        summary.refundRemaining > 0 && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSettlementModalAsdos(summary);
                              setSettleAmount(summary.refundRemaining);
                            }}
                            className="h-8 gap-1.5 bg-amber-600 text-xs font-bold text-white hover:bg-amber-700"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            Catat Setor
                          </Button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL RIWAYAT TRANSAKSI PER ASDOS */}
      {selectedAsdosDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Buku Kasbon: {selectedAsdosDetail}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftar seluruh transaksi per pengajuan, nominal pencairan, belanja riil, dan
                    status pelunasan.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAsdosDetail(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {selectedAsdosTransactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Belum ada catatan riwayat transaksi kasbon untuk Asdos ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                      <tr>
                        <th className="px-4 py-3">Kode & Menu</th>
                        <th className="px-3 py-3">Tanggal</th>
                        <th className="px-3 py-3 text-right">Dana Cair</th>
                        <th className="px-3 py-3 text-right">Belanja Riil</th>
                        <th className="px-3 py-3 text-right">Selisih</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-3 py-3 text-center">Bukti Bon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedAsdosTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                            <span className="font-mono text-xs text-rose-600 dark:text-rose-400 block">
                              {tx.requestId}
                            </span>
                            {tx.menuItem}
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500">{tx.date}</td>
                          <td className="px-3 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                            {money(tx.danaDiterima)}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                            {tx.actualSpent > 0 ? money(tx.actualSpent) : "Belum Belanja"}
                          </td>
                          <td className="px-3 py-3 text-right font-bold">
                            {tx.difference > 0 ? (
                              <span className="text-amber-600">+{money(tx.difference)} (Sisa)</span>
                            ) : tx.difference < 0 ? (
                              <span className="text-rose-600">{money(tx.difference)} (Tombok)</span>
                            ) : (
                              <span className="text-emerald-600">Rp 0 (Pas)</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                tx.status === "Menunggu Setoran"
                                  ? "bg-amber-100 text-amber-800"
                                  : tx.status === "Carry-Over Berikutnya"
                                    ? "bg-rose-100 text-rose-800"
                                    : tx.status === "Proses Belanja"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {tx.receiptImages && tx.receiptImages.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                                <FileCheck className="h-3.5 w-3.5" /> Bon Ada
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setSelectedAsdosDetail(null)}
                className="bg-slate-800 text-white"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATAT SETORAN KEMBALIAN KASBON */}
      {settlementModalAsdos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Catat Setoran Kembalian Kasbon
                  </h3>
                  <p className="text-xs text-slate-500">{settlementModalAsdos.asdosName}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettlementModalAsdos(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Sisa kembalian yang harus disetorkan Asdos ke Keuangan saat ini:{" "}
                <strong className="text-sm font-bold block mt-0.5">
                  {money(settlementModalAsdos.refundRemaining)}
                </strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal Disetor (Rp)
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Metode Pengembalian
                </label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="Transfer Rekening Kas Kampus">
                    Transfer Rekening Kas Kampus (BCA / Mandiri)
                  </option>
                  <option value="Tunai ke Kasir Keuangan">
                    Setor Tunai Langsung ke Kasir Keuangan
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  No. Bukti / Referensi Setor (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: REF-BCA-20261009-01 atau KWT-KASIR-009"
                  value={settleRefNo}
                  onChange={(e) => setSettleRefNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center dark:border-slate-700">
                <UploadCloud className="mx-auto h-7 w-7 text-slate-400" />
                <p className="mt-1 text-xs text-slate-500">
                  Unggah foto bukti transfer atau kwitansi setor kas (JPG/PNG/PDF, maks 5 MB)
                </p>
                <span className="mt-2 inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Pilih Berkas Bukti Setor
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSettlementModalAsdos(null)}>
                Batal
              </Button>
              <Button
                onClick={handleConfirmSettlement}
                className="bg-amber-600 font-bold text-white hover:bg-amber-700"
              >
                Konfirmasi Setoran Kasbon
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
