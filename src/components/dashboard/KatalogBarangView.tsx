import { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  Edit,
  PowerOff,
  Power,
  RefreshCw,
  AlertCircle,
  Filter,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SpakeApi } from "@/lib/api-client";
import { money } from "@/lib/utils";

export interface KatalogBarangData {
  id: string;
  kode?: string | null;
  nama: string;
  kategori?: string | null;
  satuan: string;
  harga_acuan: number | string;
  stok_tersedia?: number | string | null;
  target_unit?: string | null;
  aktif: boolean;
  created_at?: string;
  updated_at?: string;
}

interface KatalogBarangViewProps {
  notify?: (msg: string) => void;
}

export function KatalogBarangView({ notify }: KatalogBarangViewProps) {
  const queryClient = useQueryClient();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKategori, setSelectedKategori] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Dialog Add/Edit states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KatalogBarangData | null>(null);

  // Form input states
  const [formData, setFormData] = useState({
    nama: "",
    kode: "",
    kategori: "",
    satuan: "",
    harga_acuan: "",
    stok_tersedia: "0",
    target_unit: "Seluruh Unit",
    aktif: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Confirmation dialog state for deactivate / activate
  const [confirmDialogItem, setConfirmDialogItem] = useState<{
    item: KatalogBarangData;
    action: "deactivate" | "activate";
  } | null>(null);

  // Fetch all items (both active and inactive for managers)
  const {
    data: katalogResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["katalog-barang", "all"],
    queryFn: async () => {
      const res = await SpakeApi.getKatalogBarang(false, true);
      return (res.data || []) as unknown as KatalogBarangData[];
    },
  });

  const items = useMemo(() => katalogResponse || [], [katalogResponse]);

  // Unique categories for filter
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.kategori && item.kategori.trim()) {
        set.add(item.kategori.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchQuery =
        !q ||
        (item.nama && item.nama.toLowerCase().includes(q)) ||
        (item.kode && item.kode.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q));

      const matchKategori = selectedKategori === "ALL" || item.kategori === selectedKategori;

      const matchStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "AKTIF" && item.aktif) ||
        (selectedStatus === "NONAKTIF" && !item.aktif);

      return matchQuery && matchKategori && matchStatus;
    });
  }, [items, searchQuery, selectedKategori, selectedStatus]);

  // Mutation Save (Create or Update)
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string | undefined;
      nama: string;
      kode?: string | undefined;
      kategori?: string | undefined;
      satuan: string;
      harga_acuan: number;
      stok_tersedia: number;
      target_unit?: string | undefined;
      aktif?: boolean | undefined;
    }) => {
      if (payload.id) {
        return SpakeApi.updateKatalogBarang(payload.id, {
          nama: payload.nama,
          kode: payload.kode ?? null,
          kategori: payload.kategori,
          satuan: payload.satuan,
          harga_acuan: payload.harga_acuan,
          stok_tersedia: payload.stok_tersedia,
          target_unit: payload.target_unit,
          aktif: payload.aktif,
        });
      } else {
        return SpakeApi.createKatalogBarang({
          nama: payload.nama,
          kode: payload.kode,
          kategori: payload.kategori,
          satuan: payload.satuan,
          harga_acuan: payload.harga_acuan,
          stok_tersedia: payload.stok_tersedia,
          target_unit: payload.target_unit,
          aktif: payload.aktif ?? true,
        });
      }
    },
    onSuccess: (_, variables) => {
      const msg = variables.id
        ? `Barang "${variables.nama}" berhasil diperbarui.`
        : `Barang "${variables.nama}" berhasil ditambahkan ke katalog.`;
      if (notify) {
        notify(msg);
      } else {
        toast.success(msg);
      }

      // Invalidate relevant queries
      void queryClient.invalidateQueries({ queryKey: ["katalog-barang"] });
      void queryClient.invalidateQueries({ queryKey: ["forecasting-predictions"] });
      void queryClient.invalidateQueries({ queryKey: ["forecasting-recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["forecasting-alur-b"] });

      setIsFormOpen(false);
      setEditingItem(null);
    },
    onError: (err: unknown) => {
      const errorObj = err as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
        message?: string;
      };
      const serverErrors = errorObj.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        const mappedErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(serverErrors)) {
          if (Array.isArray(msgs) && msgs.length > 0 && typeof msgs[0] === "string") {
            mappedErrors[key] = msgs[0];
          }
        }
        setFormErrors(mappedErrors);
      } else {
        const errorMsg =
          errorObj.response?.data?.message ||
          errorObj.message ||
          "Gagal menyimpan data katalog barang.";
        toast.error(errorMsg);
      }
    },
  });

  // Mutation Deactivate / Activate
  const toggleAktifMutation = useMutation({
    mutationFn: async ({
      item,
      targetAktif,
    }: {
      item: KatalogBarangData;
      targetAktif: boolean;
    }) => {
      if (targetAktif) {
        return SpakeApi.updateKatalogBarang(item.id, { aktif: true });
      } else {
        return SpakeApi.deleteKatalogBarang(item.id);
      }
    },
    onSuccess: (_, { item, targetAktif }) => {
      const msg = targetAktif
        ? `Barang "${item.nama}" berhasil diaktifkan kembali.`
        : `Barang "${item.nama}" berhasil dinonaktifkan.`;
      if (notify) {
        notify(msg);
      } else {
        toast.success(msg);
      }

      void queryClient.invalidateQueries({ queryKey: ["katalog-barang"] });
      void queryClient.invalidateQueries({ queryKey: ["forecasting-predictions"] });
      void queryClient.invalidateQueries({ queryKey: ["forecasting-recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["forecasting-alur-b"] });

      setConfirmDialogItem(null);
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { message?: string })?.message || "Gagal mengubah status aktif barang.";
      toast.error(errorMsg);
    },
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      nama: "",
      kode: "",
      kategori: categoryOptions[0] || "Umum & ATK",
      satuan: "",
      harga_acuan: "",
      stok_tersedia: "0",
      target_unit: "Seluruh Unit",
      aktif: true,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: KatalogBarangData) => {
    setEditingItem(item);
    setFormData({
      nama: item.nama || "",
      kode: item.kode || "",
      kategori: item.kategori || "Umum & ATK",
      satuan: item.satuan || "",
      harga_acuan: String(item.harga_acuan || ""),
      stok_tersedia: String(item.stok_tersedia ?? "0"),
      target_unit: item.target_unit || "Seluruh Unit",
      aktif: Boolean(item.aktif),
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.nama.trim()) {
      errors["nama"] = "Nama barang wajib diisi.";
    }
    if (!formData.satuan.trim()) {
      errors["satuan"] = "Satuan barang wajib diisi.";
    }
    const hargaNum = Number(formData.harga_acuan);
    if (!formData.harga_acuan || isNaN(hargaNum) || hargaNum < 1) {
      errors["harga_acuan"] = "Harga acuan harus minimal Rp 1.";
    } else if (hargaNum > 1000000000) {
      errors["harga_acuan"] = "Harga acuan maksimal Rp 1.000.000.000.";
    }

    const stokNum = Number(formData.stok_tersedia);
    if (isNaN(stokNum) || stokNum < 0) {
      errors["stok_tersedia"] = "Stok tersedia tidak boleh kurang dari 0.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    saveMutation.mutate({
      id: editingItem?.id,
      nama: formData.nama.trim(),
      kode: formData.kode.trim() || undefined,
      kategori: formData.kategori.trim() || "Umum & ATK",
      satuan: formData.satuan.trim(),
      harga_acuan: hargaNum,
      stok_tersedia: stokNum,
      target_unit: formData.target_unit.trim() || "Seluruh Unit",
      aktif: formData.aktif,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-foreground flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                <Package className="size-5" />
              </span>
              Katalog Barang
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Kelola daftar barang Alur B beserta satuan dan harga acuan. Harga acuan dipakai
              sebagai nilai awal di form pengajuan dan untuk estimasi anggaran peramalan.
            </p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="h-9 gap-1.5 text-xs font-semibold cursor-pointer"
              title="Segarkan data"
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer flex-1 sm:flex-none"
            >
              <Plus className="size-4" />
              Tambah Barang
            </Button>
          </div>
        </div>

        {/* Toolbar: Search & Filters */}
        <div className="mt-5 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama, kode, atau ID barang…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          {/* Category filter */}
          <div className="sm:col-span-4 flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground shrink-0 hidden sm:block" />
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ALL">Semua Kategori ({items.length})</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ALL">Semua Status</option>
              <option value="AKTIF">Hanya Aktif</option>
              <option value="NONAKTIF">Hanya Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Table & Cards */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="size-6 animate-spin text-blue-600" />
            <span>Memuat katalog barang…</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-1.5">
            <AlertCircle className="size-8 text-muted-foreground mx-auto mb-1 opacity-70" />
            <p className="font-semibold text-foreground">Tidak ada barang yang ditemukan.</p>
            <p className="text-[11px]">
              Coba sesuaikan kata kunci pencarian atau ubah filter status/kategori.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-5 py-3">Kode / ID</th>
                    <th className="px-5 py-3">Nama Barang &amp; Kategori</th>
                    <th className="px-4 py-3">Satuan</th>
                    <th className="px-4 py-3 text-right">Harga Acuan</th>
                    <th className="px-4 py-3 text-center">Stok</th>
                    <th className="px-4 py-3">Target Unit</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-surface/60 ${
                        !item.aktif ? "bg-muted/30 opacity-75" : ""
                      }`}
                      style={{ animationDelay: `${idx * 20}ms` }}
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-foreground whitespace-nowrap">
                        <span className="text-blue-600 dark:text-blue-400">[{item.id}]</span>
                        {item.kode && item.kode !== item.id && (
                          <span className="block text-[10px] font-mono font-medium text-muted-foreground">
                            {item.kode}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-foreground leading-snug">{item.nama}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.kategori || "Umum & ATK"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">
                        {item.satuan}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-foreground text-right whitespace-nowrap">
                        {money(Number(item.harga_acuan))}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-xs">
                        {item.stok_tersedia ?? 0}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground truncate max-w-[150px]">
                        {item.target_unit || "Seluruh Unit"}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {item.aktif ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-7.5 px-2.5 text-xs font-semibold gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                            title="Ubah data barang"
                          >
                            <Edit className="size-3" />
                            Ubah
                          </Button>
                          {item.aktif ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDialogItem({ item, action: "deactivate" })}
                              className="h-7.5 px-2.5 text-xs font-semibold gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 cursor-pointer"
                              title="Nonaktifkan barang dari pengajuan"
                            >
                              <PowerOff className="size-3" />
                              Nonaktifkan
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDialogItem({ item, action: "activate" })}
                              className="h-7.5 px-2.5 text-xs font-semibold gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/40 dark:hover:bg-emerald-950/30 cursor-pointer"
                              title="Aktifkan kembali barang ini"
                            >
                              <Power className="size-3" />
                              Aktifkan
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border p-3 space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border border-border p-3.5 space-y-2.5 ${
                    !item.aktif ? "bg-muted/20 opacity-80" : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400">
                        [{item.id}]
                      </span>
                      {item.kode && item.kode !== item.id && (
                        <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                          · {item.kode}
                        </span>
                      )}
                      <h4 className="font-bold text-sm text-foreground mt-0.5">{item.nama}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {item.kategori || "Umum & ATK"}
                      </p>
                    </div>
                    {item.aktif ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        Aktif
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-300">
                        Nonaktif
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Harga Acuan:</span>
                      <span className="font-mono font-bold text-foreground">
                        {money(Number(item.harga_acuan))} / {item.satuan}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Stok / Unit:</span>
                      <span className="font-medium text-foreground">
                        {item.stok_tersedia ?? 0} · {item.target_unit || "Semua"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                      className="h-8 text-xs font-semibold gap-1 text-primary cursor-pointer flex-1"
                    >
                      <Edit className="size-3.5" />
                      Ubah
                    </Button>
                    {item.aktif ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDialogItem({ item, action: "deactivate" })}
                        className="h-8 text-xs font-semibold gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer flex-1"
                      >
                        <PowerOff className="size-3.5" />
                        Nonaktifkan
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDialogItem({ item, action: "activate" })}
                        className="h-8 text-xs font-semibold gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 cursor-pointer flex-1"
                      >
                        <Power className="size-3.5" />
                        Aktifkan
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Form Dialog: Add or Edit */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] sm:max-w-lg overflow-y-auto rounded-xl border-border p-0 shadow-2xl">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader className="border-b border-border bg-surface px-5 py-4 text-left">
              <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
                <Package className="size-4 text-blue-600" />
                {editingItem ? `Ubah Data Barang [${editingItem.id}]` : "Tambah Barang Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Lengkapi informasi barang katalog Alur B. Harga acuan dipakai untuk form pengajuan
                dan perhitungan estimasi ramalan.
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 space-y-4 text-xs">
              {/* Nama Barang */}
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Nama Barang <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Contoh: Kertas HVS A4 80gr PaperOne"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="h-9 text-xs font-semibold"
                />
                {formErrors["nama"] && (
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                    {formErrors["nama"]}
                  </p>
                )}
              </div>

              {/* Kode Barang & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Kode Barang{" "}
                    <span className="text-muted-foreground font-normal">(opsional)</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: ATK-HVS-A4"
                    value={formData.kode}
                    onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                    className="h-9 text-xs font-mono font-medium"
                  />
                  {formErrors["kode"] && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                      {formErrors["kode"]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Kategori Barang
                  </label>
                  <Input
                    type="text"
                    list="kategori-suggestions"
                    placeholder="Pilih atau ketik kategori"
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <datalist id="kategori-suggestions">
                    {categoryOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                    <option value="Kertas & Dokumen" />
                    <option value="Tinta & Toner" />
                    <option value="Alat Tulis Kantor" />
                    <option value="Kebersihan & Sarpras" />
                  </datalist>
                  {formErrors["kategori"] && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                      {formErrors["kategori"]}
                    </p>
                  )}
                </div>
              </div>

              {/* Satuan & Harga Acuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Contoh: Rim, Pack, Lusin, Pcs"
                    value={formData.satuan}
                    onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                    className="h-9 text-xs font-semibold"
                  />
                  {formErrors["satuan"] && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                      {formErrors["satuan"]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Harga Acuan (Rp) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    required
                    min="1"
                    max="1000000000"
                    step="any"
                    placeholder="Contoh: 55000"
                    value={formData.harga_acuan}
                    onChange={(e) => setFormData({ ...formData, harga_acuan: e.target.value })}
                    className="h-9 text-xs font-mono font-bold"
                  />
                  {editingItem && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Harga sebelumnya: {money(Number(editingItem.harga_acuan))}
                    </p>
                  )}
                  {formErrors["harga_acuan"] && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                      {formErrors["harga_acuan"]}
                    </p>
                  )}
                </div>
              </div>

              {/* Stok Tersedia & Target Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Stok Tersedia
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={formData.stok_tersedia}
                    onChange={(e) => setFormData({ ...formData, stok_tersedia: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                  {formErrors["stok_tersedia"] && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                      {formErrors["stok_tersedia"]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-foreground block mb-1">
                    Target Unit
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: Seluruh Unit"
                    value={formData.target_unit}
                    onChange={(e) => setFormData({ ...formData, target_unit: e.target.value })}
                    className="h-9 text-xs"
                  />
                  {formErrors["target_unit"] && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                      {formErrors["target_unit"]}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Aktif (khusus saat edit) */}
              {editingItem && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <input
                    type="checkbox"
                    id="aktif-checkbox"
                    checked={formData.aktif}
                    onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                    className="size-4 rounded border-input text-blue-600 focus:ring-primary cursor-pointer"
                  />
                  <label
                    htmlFor="aktif-checkbox"
                    className="text-xs font-semibold text-foreground cursor-pointer"
                  >
                    Item katalog berstatus aktif (dapat dipilih di form pengajuan Alur B)
                  </label>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-border bg-surface px-5 py-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={saveMutation.isPending}
                className="h-8.5 text-xs font-semibold cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="h-8.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {saveMutation.isPending ? "Menyimpan…" : "Simpan Barang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Deactivate / Activate */}
      <Dialog
        open={Boolean(confirmDialogItem)}
        onOpenChange={(open) => !open && setConfirmDialogItem(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-md rounded-xl border-border p-5 shadow-2xl">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              {confirmDialogItem?.action === "deactivate" ? (
                <>
                  <PowerOff className="size-4 text-rose-600" />
                  Nonaktifkan Barang dari Katalog?
                </>
              ) : (
                <>
                  <Power className="size-4 text-emerald-600" />
                  Aktifkan Kembali Barang?
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {confirmDialogItem?.action === "deactivate"
                ? "Barang nonaktif tidak muncul di form pengajuan, tetapi riwayat pengajuan dan data peramalannya tetap tersimpan."
                : `Aktifkan kembali "${confirmDialogItem?.item.nama}" agar dapat diajukan oleh staf unit kerja di form pengadaan.`}
            </DialogDescription>
          </DialogHeader>

          {confirmDialogItem && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-bold text-foreground">
                [{confirmDialogItem.item.id}] {confirmDialogItem.item.nama}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Harga Acuan: {money(Number(confirmDialogItem.item.harga_acuan))} /{" "}
                {confirmDialogItem.item.satuan}
              </p>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialogItem(null)}
              disabled={toggleAktifMutation.isPending}
              className="h-8.5 text-xs font-semibold cursor-pointer"
            >
              Batal
            </Button>
            {confirmDialogItem?.action === "deactivate" ? (
              <Button
                type="button"
                size="sm"
                disabled={toggleAktifMutation.isPending}
                onClick={() => {
                  if (confirmDialogItem) {
                    toggleAktifMutation.mutate({
                      item: confirmDialogItem.item,
                      targetAktif: false,
                    });
                  }
                }}
                className="h-8.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                {toggleAktifMutation.isPending ? "Menonaktifkan…" : "Nonaktifkan Barang"}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={toggleAktifMutation.isPending}
                onClick={() => {
                  if (confirmDialogItem) {
                    toggleAktifMutation.mutate({
                      item: confirmDialogItem.item,
                      targetAktif: true,
                    });
                  }
                }}
                className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                {toggleAktifMutation.isPending ? "Mengaktifkan…" : "Aktifkan Barang"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
