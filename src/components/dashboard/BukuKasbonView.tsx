import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SpakeApi } from "@/lib/api-client";
import {
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck,
  Search,
  Download,
  Filter,
  HandCoins,
  UploadCloud,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import {
  type RequestItem,
  type Role,
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

function getRequestSisa(r: RequestItem): number {
  if (r.refundAmount && r.refundAmount > 0) return r.refundAmount;
  const received = r.danaDiterima || r.nominalTransfer || 0;
  const spent = r.actualSpent || 0;
  const diff = received - spent;
  return diff > 0 ? diff : 0;
}

function hasBuktiSetor(r: RequestItem): boolean {
  return Boolean(
    r.buktiSetorUrl ||
    r.penyelesaian?.some((p) => p.jenis === "setor" && Boolean(p.buktiPath || p.bukti_path)),
  );
}

function isMenungguSetoran(r: RequestItem): boolean {
  if (r.alur && r.alur !== "A") return false;
  if (hasBuktiSetor(r)) return false;
  const sisa = getRequestSisa(r);
  if (sisa <= 0) return false;
  if (
    r.status === "DITOLAK_KOORD" ||
    r.status === "DITOLAK_KAPRODI" ||
    r.status === "DITOLAK_KEUANGAN"
  ) {
    return false;
  }
  return true;
}

export function BukuKasbonView({ requests, role, currentUser, notify }: BukuKasbonViewProps) {
  const isPemohon = checkPemohon(role);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Semua Status");
  const [selectedAsdosDetail, setSelectedAsdosDetail] = useState<string | null>(
    isPemohon && currentUser ? currentUser.name : null,
  );
  const [settlementModalAsdos, setSettlementModalAsdos] = useState<KasbonAsdosSummary | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<string>("Transfer Rekening Kas Kampus");
  const [settleRefNo, setSettleRefNo] = useState<string>("");
  const [buktiSetorFile, setBuktiSetorFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // State Modal Ganti Langsung Tombok (Khusus Keuangan Kitchen)
  const [gantiLangsungAsdos, setGantiLangsungAsdos] = useState<KasbonAsdosSummary | null>(null);
  const [buktiGantiFile, setBuktiGantiFile] = useState<File | null>(null);
  const [catatanGanti, setCatatanGanti] = useState<string>("");
  const [isSubmittingGanti, setIsSubmittingGanti] = useState<boolean>(false);
  const [gantiError, setGantiError] = useState<string | null>(null);
  const gantiFileInputRef = useRef<HTMLInputElement>(null);

  // Ambil hanya pengajuan Alur A (Kitchen/Praktikum) yang memiliki data keuangan
  const kitchenRequests = useMemo(() => {
    return requests.filter((r) => !r.alur || r.alur === "A");
  }, [requests]);

  // Pengajuan Alur A milik Asdos yang masih memiliki sisa kasbon ("Menunggu Setoran")
  const eligibleRequests = useMemo(() => {
    if (!settlementModalAsdos) return [];
    return kitchenRequests.filter(
      (r) => r.applicant === settlementModalAsdos.asdosName && isMenungguSetoran(r),
    );
  }, [settlementModalAsdos, kitchenRequests]);

  // Pilih otomatis jika pengajuan yang memenuhi syarat hanya satu (atau update default saat modal dibuka)
  useEffect(() => {
    if (!settlementModalAsdos) {
      setSelectedRequestId("");
      setBuktiSetorFile(null);
      setFormError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    if (eligibleRequests.length > 0) {
      if (!selectedRequestId || !eligibleRequests.some((r) => r.id === selectedRequestId)) {
        const first = eligibleRequests[0];
        if (first) {
          setSelectedRequestId(first.id);
          setSettleAmount(getRequestSisa(first));
        }
      }
    } else {
      setSelectedRequestId("");
      setSettleAmount(0);
    }
  }, [settlementModalAsdos, eligibleRequests, selectedRequestId]);

  // Pengajuan Alur A milik Asdos yang masih memiliki tombok tertunda
  const pendingTombokList = useMemo(() => {
    if (!gantiLangsungAsdos) return [];
    return kitchenRequests
      .filter((r) => r.applicant === gantiLangsungAsdos.asdosName)
      .map((r) => {
        const coItems = (r.penyelesaian || []).filter(
          (p) =>
            p.jenis === "carry_over" &&
            !p.kasbonTujuanId &&
            !p.kasbon_tujuan_id &&
            !p.digantiLangsungAt &&
            !p.diganti_langsung_at,
        );
        let amount = coItems.reduce((acc, p) => acc + (Number(p.nominal) || 0), 0);
        if (amount === 0 && r.deficitAmount && r.deficitAmount > 0) {
          const isSettled = r.penyelesaian?.some((p) =>
            Boolean(
              p.kasbonTujuanId ||
              p.kasbon_tujuan_id ||
              p.digantiLangsungAt ||
              p.diganti_langsung_at,
            ),
          );
          if (!isSettled) {
            amount = r.deficitAmount;
          }
        }
        return {
          request: r,
          amount,
        };
      })
      .filter((item) => item.amount > 0);
  }, [gantiLangsungAsdos, kitchenRequests]);

  const totalTombokNominal = useMemo(() => {
    return pendingTombokList.reduce((acc, item) => acc + item.amount, 0);
  }, [pendingTombokList]);

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
            Boolean(
              p.kasbonTujuanId ||
              p.kasbon_tujuan_id ||
              p.digantiLangsungAt ||
              p.diganti_langsung_at,
            ),
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
        Boolean(
          p.kasbonTujuanId || p.kasbon_tujuan_id || p.digantiLangsungAt || p.diganti_langsung_at,
        ),
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setBuktiSetorFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      const err = "Ukuran berkas bukti setor maksimal 5 MB.";
      setFormError(err);
      toast.error(err);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setBuktiSetorFile(null);
      return;
    }
    setBuktiSetorFile(file);
    setFormError(null);
  };

  async function handleConfirmSettlement() {
    if (!settlementModalAsdos) return;
    if (!selectedRequestId) {
      const err = "Pilih pengajuan yang akan diselesaikan setoran kasbonnya.";
      setFormError(err);
      toast.error(err);
      return;
    }
    if (settleAmount <= 0) {
      const err = "Nominal setoran harus lebih dari Rp 0.";
      setFormError(err);
      toast.error(err);
      return;
    }
    if (!buktiSetorFile) {
      const err = "Bukti setor sisa dana kasbon wajib diunggah (JPG/PNG/PDF, maks 5 MB).";
      setFormError(err);
      toast.error(err);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const targetReq = eligibleRequests.find((r) => r.id === selectedRequestId);
      const formData = new FormData();
      formData.append("bukti_setor", buktiSetorFile);
      if (settleRefNo.trim()) {
        formData.append("nomor_referensi", settleRefNo.trim());
        formData.append("nomorReferensi", settleRefNo.trim());
      }
      if (settleMethod) {
        formData.append("metode_pengembalian", settleMethod);
        formData.append("metodePengembalian", settleMethod);
      }
      if (targetReq?.actualSpent) {
        formData.append("actualSpent", String(targetReq.actualSpent));
      }

      const res = await SpakeApi.catatPenyelesaianKasbon(selectedRequestId, formData);
      const successMsg =
        res?.message ||
        `Setoran kembalian sebesar ${money(
          settleAmount,
        )} dari ${settlementModalAsdos.asdosName} berhasil dicatat via ${settleMethod}. Transaksi kasbon diperbarui!`;

      notify(successMsg);

      await queryClient.invalidateQueries({ queryKey: ["procurement-requests"] });

      setSettlementModalAsdos(null);
      setSelectedRequestId("");
      setSettleAmount(0);
      setSettleRefNo("");
      setBuktiSetorFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mencatat setoran kasbon.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleConfirmGantiLangsung = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gantiLangsungAsdos) return;
    if (!buktiGantiFile) {
      setGantiError("Bukti transfer wajib diunggah (JPG/PNG/PDF, maks 5 MB).");
      return;
    }

    if (buktiGantiFile.size > 5 * 1024 * 1024) {
      setGantiError("Ukuran berkas bukti transfer maksimal 5 MB.");
      return;
    }

    setIsSubmittingGanti(true);
    setGantiError(null);

    try {
      const formData = new FormData();
      formData.append("applicant", gantiLangsungAsdos.asdosName);
      formData.append("bukti_transfer", buktiGantiFile);
      if (catatanGanti.trim()) {
        formData.append("catatan", catatanGanti.trim());
      }

      const res = await SpakeApi.gantiLangsungTombok(formData);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["procurement-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);

      const successMsg =
        res?.message ||
        `Tombok sebesar ${money(totalTombokNominal)} berhasil diganti langsung kepada ${gantiLangsungAsdos.asdosName}.`;
      notify(successMsg);

      setGantiLangsungAsdos(null);
      setBuktiGantiFile(null);
      setCatatanGanti("");
      if (gantiFileInputRef.current) {
        gantiFileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses ganti langsung tombok.";
      setGantiError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingGanti(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & FORMULA BANNER */}
      <div className="rounded-2xl border border-rose-200/60 bg-gradient-to-r from-rose-50/80 via-amber-50/50 to-orange-50/60 p-5 dark:border-rose-900/40 dark:from-rose-950/20 dark:via-amber-950/10 dark:to-orange-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
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
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" /> Menunggu Setoran
                      </span>
                    )}
                    {summary.status === "Carry-Over Berikutnya" && (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        <ArrowUpRight className="h-3 w-3" /> Tombok Carry-Over
                      </span>
                    )}
                    {summary.status === "Lunas" && (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
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
                            className="h-8 gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <HandCoins className="h-3.5 w-3.5" />
                            Catat Setor
                          </Button>
                        )}

                      {/* Tombol Ganti Langsung khusus Keuangan Kitchen */}
                      {role === "Keuangan Kitchen" && summary.deficitCarryOver > 0 && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setGantiLangsungAsdos(summary);
                            setBuktiGantiFile(null);
                            setCatatanGanti("");
                            setGantiError(null);
                          }}
                          className="h-8 gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                          title="Ganti langsung tombok kasbon Asdos tanpa menunggu pengajuan berikutnya"
                        >
                          <HandCoins className="h-3.5 w-3.5" />
                          Ganti Langsung
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
                              className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                tx.status === "Menunggu Setoran"
                                  ? "bg-amber-100 text-amber-700"
                                  : tx.status === "Carry-Over Berikutnya"
                                    ? "bg-rose-100 text-rose-700"
                                    : tx.status === "Proses Belanja"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-emerald-100 text-emerald-700"
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
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                  <HandCoins className="h-5 w-5" />
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

              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                  {formError}
                </div>
              )}

              {/* Dropdown Pengajuan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pengajuan Alur A (PR) yang Disetor <span className="text-red-500">*</span>
                </label>
                {eligibleRequests.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                    Tidak ada pengajuan Alur A dengan sisa kasbon yang menunggu setoran untuk Asdos
                    ini.
                  </div>
                ) : (
                  <select
                    value={selectedRequestId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedRequestId(id);
                      const req = eligibleRequests.find((r) => r.id === id);
                      if (req) {
                        setSettleAmount(getRequestSisa(req));
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {eligibleRequests.map((req) => {
                      const sisa = getRequestSisa(req);
                      return (
                        <option key={req.id} value={req.id}>
                          [{req.id}] {req.item || "Praktikum"} — Sisa: {money(sisa)}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal Disetor (Rp) <span className="text-red-500">*</span>
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

              {/* Area Unggah Bukti Setor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bukti Setor Sisa Kasbon <span className="text-red-500">*</span>
                </label>
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    id="modal-bukti-setor-file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {buktiSetorFile ? (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {buktiSetorFile.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(buktiSetorFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBuktiSetorFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-0 cursor-pointer"
                        title="Hapus berkas"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud className="mx-auto h-7 w-7 text-slate-400" />
                      <p className="mt-1 text-xs text-slate-500">
                        Unggah foto bukti transfer atau kwitansi setor kas (JPG/PNG/PDF, maks 5 MB)
                      </p>
                      <label
                        htmlFor="modal-bukti-setor-file"
                        className="mt-2 inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        Pilih Berkas Bukti Setor
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  setSettlementModalAsdos(null);
                  setSelectedRequestId("");
                  setBuktiSetorFile(null);
                  setFormError(null);
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmSettlement}
                disabled={
                  isSubmitting || !selectedRequestId || !buktiSetorFile || settleAmount <= 0
                }
                className="bg-emerald-600 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                    Menyimpan Setoran...
                  </>
                ) : (
                  "Konfirmasi Setoran Kasbon"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GANTI LANGSUNG TOMBOK (KHUSUS KEUANGAN KITCHEN) */}
      {gantiLangsungAsdos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                  <HandCoins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Ganti Langsung Tombok Kasbon
                  </h3>
                  <p className="text-xs text-slate-500">{gantiLangsungAsdos.asdosName}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGantiLangsungAsdos(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleConfirmGantiLangsung} className="mt-4 space-y-4">
              <div className="rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800">
                <span className="text-slate-600 dark:text-emerald-300">
                  Total tombok kasbon Asdos yang diganti langsung:
                </span>
                <strong className="text-base font-black block mt-0.5 text-emerald-700 dark:text-emerald-300">
                  {money(totalTombokNominal)}
                </strong>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Dana ditransfer langsung saat ini ke Asdos tanpa menunggu pengajuan berikutnya.
                </span>
              </div>

              {gantiError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                  {gantiError}
                </div>
              )}

              {/* DAFTAR PR ASAL TOMBOK */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Daftar Pengajuan (PR) Asal Tombok:
                </label>
                {pendingTombokList.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                    Tidak ada tombok tertunda untuk Asdos ini.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden text-xs">
                    {pendingTombokList.map(({ request: req, amount }) => (
                      <div key={req.id} className="p-3 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {req.id} — {req.menu || req.item || "Praktikum Masak"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {req.course || req.department || "Lab Kitchen"} • {req.date}
                          </div>
                        </div>
                        <div className="text-right font-black text-rose-600 dark:text-rose-400">
                          {money(amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* INPUT UNGGAH BUKTI TRANSFER */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unggah Bukti Transfer / Slip Giro <span className="text-red-500">*</span>
                </label>
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                  <input
                    ref={gantiFileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    id="modal-bukti-ganti-file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setBuktiGantiFile(file);
                      setGantiError(null);
                    }}
                  />
                  {buktiGantiFile ? (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {buktiGantiFile.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(buktiGantiFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBuktiGantiFile(null);
                          if (gantiFileInputRef.current) {
                            gantiFileInputRef.current.value = "";
                          }
                        }}
                        className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-0 cursor-pointer"
                        title="Hapus berkas"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud className="mx-auto h-7 w-7 text-slate-400" />
                      <p className="mt-1 text-xs text-slate-500">
                        Unggah foto bukti transfer atau kwitansi bank (JPG/PNG/PDF, maks 5 MB)
                      </p>
                      <label
                        htmlFor="modal-bukti-ganti-file"
                        className="mt-2 inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition-colors"
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        Pilih Berkas Bukti Transfer
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* CATATAN (OPSIONAL) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Nomor Referensi Bank (Opsional)
                </label>
                <textarea
                  value={catatanGanti}
                  onChange={(e) => setCatatanGanti(e.target.value)}
                  placeholder="Contoh: Transfer via BCA Ref: TRF-2026-9912..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 min-h-16"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmittingGanti}
                  onClick={() => setGantiLangsungAsdos(null)}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingGanti || !buktiGantiFile || pendingTombokList.length === 0}
                  className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 gap-1.5 cursor-pointer"
                >
                  {isSubmittingGanti ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                      Memproses Ganti Langsung...
                    </>
                  ) : (
                    "Konfirmasi Ganti Langsung"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
