import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/common/MetricCard";
import {
  PackageCheck,
  Package,
  CheckCircle2,
  Clock3,
  Box,
  Info,
  Search,
  Edit,
  Trash2,
  X,
} from "lucide-react";

interface InventoryStockViewProps {
  labStock: Record<string, { stock: number; unit: string }>;
  onQuickAdjustStock: (name: string, delta: number, reasonDesc: string) => void;
  onEditStockItem: (item: {
    name: string;
    stock: number;
    unit: string;
    originalName?: string;
  }) => void;
  onDeleteStock: (name: string) => void;
}

export function InventoryStockView({
  labStock,
  onQuickAdjustStock,
  onEditStockItem,
  onDeleteStock,
}: InventoryStockViewProps) {
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockFilterStatus, setStockFilterStatus] = useState<"Semua" | "Tersedia" | "Menipis" | "Habis">("Semua");

  const entries = Object.entries(labStock);
  const totalItems = entries.length;
  const safeCount = entries.filter(([, v]) => v.stock > 1).length;
  const lowCount = entries.filter(([, v]) => v.stock > 0 && v.stock <= 1).length;
  const outCount = entries.filter(([, v]) => v.stock === 0).length;

  let items = Object.entries(labStock).map(([name, data]) => ({
    name,
    stock: data.stock,
    unit: data.unit,
  }));

  if (stockSearchQuery.trim()) {
    const q = stockSearchQuery.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(q));
  }

  if (stockFilterStatus === "Tersedia") {
    items = items.filter((i) => i.stock > 1);
  } else if (stockFilterStatus === "Menipis") {
    items = items.filter((i) => i.stock > 0 && i.stock <= 1);
  } else if (stockFilterStatus === "Habis") {
    items = items.filter((i) => i.stock === 0);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary uppercase tracking-wider">
                Inventaris Laboratorium
              </span>
              <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                <PackageCheck className="size-5 text-primary" />
                Kelola Stok Bahan Masak Laboratorium
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tugas Staf / Asdos: Input barang belanjaan yang telah tiba, perbarui sisa bahan pasca praktikum, edit takaran, atau hapus item.
            </p>
          </div>
        </div>

        {/* Summary Metric Cards for Lab Stock */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Bahan di Lab"
            value={`${totalItems} Item`}
            foot="Bahan masakan terdaftar di inventaris"
            icon={Package}
            kind="primary"
          />
          <MetricCard
            label="Stok Aman / Tersedia"
            value={`${safeCount} Item`}
            foot="Ketersediaan memadai (> 1 unit)"
            icon={CheckCircle2}
            trend="Tersedia"
            kind="success"
          />
          <MetricCard
            label="Stok Menipis"
            value={`${lowCount} Item`}
            foot="Perlu dipantau (≤ 1 unit)"
            icon={Clock3}
            trend="Hampir Habis"
            kind="warning"
          />
          <MetricCard
            label="Stok Habis (0)"
            value={`${outCount} Item`}
            foot="Otomatis masuk daftar belanja saat diajukan"
            icon={Box}
            trend="Perlu Belanja"
            kind="danger"
          />
        </div>

        {/* Operational Note Banner for Asdos */}
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
          <p className="font-bold flex items-center gap-1.5">
            <Info className="size-4 shrink-0 text-blue-700 dark:text-blue-400" />
            Panduan Pengelolaan Stok Asdos Laboratorium:
          </p>
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
            <li><strong>Belanja Tiba:</strong> Ketika bahan yang dibeli sudah sampai di dapur lab, gunakan tombol <strong>(+)</strong> atau <strong>Edit</strong> untuk menambahkan stok riil.</li>
            <li><strong>Sisa Pasca Praktikum:</strong> Setelah sesi kelas memasak selesai, catat sisa bahan yang belum terpakai agar tercatat sebagai stok tersedia untuk praktikum berikutnya.</li>
            <li><strong>Sinkronisasi Otomatis:</strong> Setiap kali Asdos membuat pengajuan baru, sistem akan otomatis menghitung selisih <em>(Kebutuhan Resep − Stok Lab)</em>.</li>
          </ul>
        </div>

        {/* Search and Status Filter Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={stockSearchQuery}
              onChange={(e) => setStockSearchQuery(e.target.value)}
              placeholder="Cari nama bahan di stok lab..."
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Filter Status:</span>
            {(["Semua", "Tersedia", "Menipis", "Habis"] as const).map((st) => (
              <Button
                key={st}
                variant={stockFilterStatus === st ? "default" : "outline"}
                size="sm"
                onClick={() => setStockFilterStatus(st)}
                className={`h-8 text-xs font-bold cursor-pointer ${
                  stockFilterStatus === st
                    ? "bg-[#800000] text-white hover:bg-[#660000]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtered Lab Stock Table & Mobile Cards */}
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto size-9 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">Tidak ada bahan yang sesuai filter.</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setStockSearchQuery("");
                setStockFilterStatus("Semua");
              }}
              className="mt-1 text-xs text-primary cursor-pointer"
            >
              Reset Filter
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (<sm) */}
            <div className="mt-4 space-y-2.5 sm:hidden">
              {items.map((item, idx) => (
                <div key={item.name} className="rounded-lg border border-border bg-surface p-3 space-y-2.5 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                      <p className="font-bold text-foreground text-xs">{item.name}</p>
                    </div>
                    <div>
                      {item.stock > 1 ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Tersedia
                        </span>
                      ) : item.stock > 0 ? (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          Menipis
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-[#0f172a] border border-slate-300">
                          Habis (0)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                    <div>
                      <span className="text-[11px] text-muted-foreground">Stok Saat Ini: </span>
                      <span className="font-black text-foreground text-sm">{item.stock} {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuickAdjustStock(item.name, -1, "Kurangi Stok")}
                        disabled={item.stock === 0}
                        className="size-7 p-0 text-xs font-bold text-[#0f172a] border-slate-300 cursor-pointer"
                        title="Kurangi stok (Terpakai Praktik)"
                      >
                        -1
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuickAdjustStock(item.name, 1, "Tambah Stok Belanja")}
                        className="size-7 p-0 text-xs font-bold text-emerald-600 border-emerald-200 cursor-pointer"
                        title="Tambah stok (Belanja Tiba / Sisa Praktik)"
                      >
                        +1
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onEditStockItem({
                            name: item.name,
                            stock: item.stock,
                            unit: item.unit,
                            originalName: item.name,
                          });
                        }}
                        className="h-7 px-2 text-xs font-semibold text-foreground cursor-pointer"
                      >
                        <Edit className="size-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteStock(item.name)}
                        className="size-7 p-0 text-[#0f172a] hover:text-black hover:bg-slate-100 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (sm+) */}
            <div className="mt-4 hidden sm:block overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">No</th>
                    <th className="px-4 py-3">Nama Bahan Masakan Lab</th>
                    <th className="px-4 py-3 text-right">Jumlah Stok</th>
                    <th className="px-4 py-3">Satuan</th>
                    <th className="px-4 py-3 text-center">Status Ketersediaan</th>
                    <th className="px-4 py-3 text-center">Penyesuaian Cepat</th>
                    <th className="px-4 py-3 text-right">Tindakan Asdos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => (
                    <tr key={item.name} className="hover:bg-surface/60 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${
                              item.stock > 1
                                ? "bg-emerald-500"
                                : item.stock > 0
                                  ? "bg-blue-500"
                                  : "bg-rose-500"
                            }`}
                          />
                          {item.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-sm text-foreground">
                        {item.stock}
                      </td>
                      <td className="px-4 py-3 font-medium text-muted-foreground">
                        {item.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.stock > 1 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="size-3" /> Stok Aman
                          </span>
                        ) : item.stock > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                            <Clock3 className="size-3" /> Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-[#0f172a] border border-slate-300">
                            <X className="size-3 text-[#0f172a]" /> Habis (0)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onQuickAdjustStock(item.name, -1, "Terpakai Praktik")}
                            disabled={item.stock === 0}
                            className="h-6 px-1.5 text-[10px] font-bold text-[#0f172a] border-slate-300 hover:bg-slate-100 cursor-pointer"
                            title="Kurangi stok 1 unit"
                          >
                            -1
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onQuickAdjustStock(item.name, 1, "Belanja Tiba / Sisa Praktik")}
                            className="h-6 px-1.5 text-[10px] font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
                            title="Tambah stok 1 unit"
                          >
                            +1
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onQuickAdjustStock(item.name, 5, "Belanja Tiba Partai Besar")}
                            className="h-6 px-1.5 text-[10px] font-bold text-blue-600 border-blue-200 hover:bg-blue-50 cursor-pointer"
                            title="Tambah stok 5 unit"
                          >
                            +5
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onEditStockItem({
                                name: item.name,
                                stock: item.stock,
                                unit: item.unit,
                                originalName: item.name,
                              });
                            }}
                            className="h-7 text-xs gap-1 font-semibold text-foreground hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit className="size-3" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDeleteStock(item.name)}
                            className="h-7 text-xs gap-1 font-semibold text-[#0f172a] hover:bg-slate-100 hover:text-black border-slate-300 cursor-pointer"
                          >
                            <Trash2 className="size-3" /> Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
