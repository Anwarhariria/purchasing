import React, { useState } from "react";
import { Check, Plus, Trash2, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import type { RequestItem, RequestDetail } from "@/types/procurement";

interface RequestItemsTableProps {
  activeRequest: RequestItem;
  canEditQtyOnly: boolean;
  editableDetails: RequestDetail[];
  setEditableDetails: React.Dispatch<React.SetStateAction<RequestDetail[]>>;
  handleSaveQtyChanges: (id: string, details: RequestDetail[]) => void;
}

export const RequestItemsTable: React.FC<RequestItemsTableProps> = ({
  activeRequest,
  canEditQtyOnly,
  editableDetails,
  setEditableDetails,
  handleSaveQtyChanges,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState("kg");
  const [newItemPrice, setNewItemPrice] = useState(25000);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  function handleAddItem() {
    if (!newItemName.trim()) return;
    const item: RequestDetail = {
      id: `D-koor-${Date.now()}`,
      name: newItemName.trim(),
      qty: newItemQty,
      unit: newItemUnit,
      price: newItemPrice,
      isAddedByKoord: true,
    };
    setEditableDetails((prev) => [...prev, item]);
    setNewItemName("");
    setNewItemQty(1);
    setShowAddForm(false);
  }

  function handleConfirmDelete() {
    if (!deletingId || !deleteReason.trim()) return;
    if (editableDetails.length <= 1) {
      alert(
        "Minimal 1 barang harus tersisa di pengajuan. Jika seluruhnya tidak layak, gunakan tombol Tolak.",
      );
      return;
    }
    setEditableDetails((prev) => prev.filter((d) => d.id !== deletingId));
    setDeletingId(null);
    setDeleteReason("");
  }

  const isAlurB = activeRequest.alur === "B" || activeRequest.category !== "Bahan Praktik Masak";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            {isAlurB ? "Rincian Barang Logistik & ATK" : "Rincian Bahan Praktik Masak"}
          </h4>
          {canEditQtyOnly && (
            <p className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
              Koordinator dapat menyesuaikan Qty (F-KL-01), menambah {isAlurB ? "barang" : "bahan"}{" "}
              (F-KL-02), atau menghapus item tak layak (F-KL-03).
            </p>
          )}
        </div>
        {canEditQtyOnly && (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(!showAddForm)}
              className="h-7 text-xs border-blue-400 text-blue-700 hover:bg-blue-50 font-bold"
            >
              <Plus className="size-3 mr-1" /> Tambah {isAlurB ? "Barang" : "Bahan"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveQtyChanges(activeRequest.id, editableDetails)}
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              <Check className="size-3 mr-1" /> Simpan Perubahan
            </Button>
          </div>
        )}
      </div>

      {/* FORM TAMBAH BARANG KOORDINATOR (F-KL-02) */}
      {showAddForm && canEditQtyOnly && (
        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900/50 dark:bg-blue-950/20 text-xs space-y-2">
          <div className="font-bold text-blue-900 dark:text-blue-300">
            Tambah {isAlurB ? "Barang" : "Bahan"} Baru (Ditandai &quot;Ditambah Koordinator&quot;)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2">
              <label className="text-[11px] text-muted-foreground block mb-0.5">
                Nama {isAlurB ? "Barang" : "Bahan"}:
              </label>
              <input
                type="text"
                placeholder="Contoh: Bawang Bombay Import"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full rounded border border-input bg-card px-2.5 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-0.5">
                Qty & Satuan:
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Number(e.target.value) || 1)}
                  className="w-16 rounded border border-input bg-card px-2 py-1 text-xs text-right"
                />
                <input
                  type="text"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="w-16 rounded border border-input bg-card px-2 py-1 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-0.5">
                Harga Satuan (Rp):
              </label>
              <input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(Number(e.target.value) || 0)}
                className="w-full rounded border border-input bg-card px-2.5 py-1 text-xs text-right"
              />
            </div>
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddForm(false)}
              className="h-6 text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleAddItem}
              className="h-6 text-xs bg-blue-600 text-white font-bold"
            >
              Tambahkan ke Rincian
            </Button>
          </div>
        </div>
      )}

      {/* POPUP ALASAN HAPUS BARANG (F-KL-03) */}
      {deletingId && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs dark:border-red-900/50 dark:bg-red-950/20 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-red-800 dark:text-red-300">
            <AlertCircle className="size-4" /> Alasan Penghapusan Barang (Wajib diisi):
          </div>
          <input
            type="text"
            placeholder="Contoh: Stok di chiller masih mencukupi 5 kg / Tidak sesuai standar praktikum"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            className="w-full rounded border border-red-300 bg-white dark:bg-card px-2.5 py-1.5 text-xs"
          />
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeletingId(null)}
              className="h-6 text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDelete}
              className="h-6 text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Konfirmasi Hapus Item
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Cards View (<sm) */}
      <div className="space-y-2 sm:hidden">
        {(canEditQtyOnly ? editableDetails : activeRequest.details || []).map((d, i) => (
          <div
            key={d.id}
            className="rounded-lg border border-border bg-surface p-3 text-xs space-y-1.5 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground mr-1">#{i + 1}</span>
                <span className="font-bold text-foreground">{d.name}</span>
              </div>
              <span className="font-extrabold text-foreground">{money(d.price * d.qty)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground text-[11px] pt-1.5 border-t border-border/50">
              <span>
                {money(d.price)} / {d.unit}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">Kuantitas:</span>
                {canEditQtyOnly ? (
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={d.qty}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setEditableDetails((prev) =>
                        prev.map((item, idx) => (idx === i ? { ...item, qty: val } : item)),
                      );
                    }}
                    className="h-7 w-20 rounded border border-primary/60 bg-card px-2 text-right text-xs font-bold text-primary focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <span className="font-black text-foreground">
                    {d.qty} {d.unit}
                  </span>
                )}
              </div>
            </div>
            {isAlurB && d.qtyRamalan !== undefined && d.qtyRamalan !== null && (
              <div className="text-[10px] pt-1 border-t border-border/40 space-y-0.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span>Ramalan bulan ini (RF):</span>
                  <span className="font-bold text-foreground">
                    {d.qtyRamalan} {d.unit}
                  </span>
                  {(d.tanpaModel || d.tanpa_model) && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                      baseline
                    </span>
                  )}
                </div>
                {d.qty > d.qtyRamalan * 1.5 && (
                  <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1 rounded border border-amber-200 dark:border-amber-800 text-[10px] font-semibold">
                    <AlertTriangle className="size-3 shrink-0 text-amber-600" />
                    <span>
                      Qty melebihi 150% dari ramalan ({d.qtyRamalan} {d.unit})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View (sm+) */}
      <div className="hidden sm:block overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[500px] text-left text-xs">
          <thead className="bg-surface">
            <tr>
              <th className="px-3 py-2 font-semibold">No</th>
              <th className="px-3 py-2 font-semibold">{isAlurB ? "Nama Barang" : "Nama Bahan"}</th>
              {isAlurB && (
                <th className="px-3 py-2 font-semibold text-center">Ramalan bulan ini (RF)</th>
              )}
              <th className="px-3 py-2 font-semibold text-right">Kuantitas (Qty)</th>
              <th className="px-3 py-2 font-semibold">Satuan</th>
              <th className="px-3 py-2 font-semibold text-right">Harga</th>
              <th className="px-3 py-2 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border">
            {canEditQtyOnly
              ? editableDetails.map((d, i) => (
                  <tr key={d.id} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">
                      <div>{d.name}</div>
                      {isAlurB &&
                        d.qtyRamalan !== undefined &&
                        d.qtyRamalan !== null &&
                        d.qty > d.qtyRamalan * 1.5 && (
                          <div className="mt-1">
                            <div className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 font-semibold">
                              <AlertTriangle className="size-3 shrink-0 text-amber-600" />
                              <span>
                                Qty diajukan ({d.qty}) melebihi 150% dari ramalan ({d.qtyRamalan}{" "}
                                {d.unit})
                              </span>
                            </div>
                          </div>
                        )}
                    </td>
                    {isAlurB && (
                      <td className="px-3 py-2 text-center">
                        {d.qtyRamalan !== undefined && d.qtyRamalan !== null ? (
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <span className="font-mono font-bold text-foreground">
                              {d.qtyRamalan} {d.unit}
                            </span>
                            {(d.tanpaModel || d.tanpa_model) && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                baseline
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={d.qty}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setEditableDetails((prev) =>
                            prev.map((item, idx) => (idx === i ? { ...item, qty: val } : item)),
                          );
                        }}
                        className="h-7 w-20 rounded border border-primary/60 bg-card px-2 text-right text-xs font-bold text-primary focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="px-3 py-2">{d.unit}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{money(d.price)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{money(d.price * d.qty)}</td>
                  </tr>
                ))
              : (activeRequest.details || []).map((d, i) => (
                  <tr key={d.id} className="hover:bg-surface/50">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">
                      <div>{d.name}</div>
                      {isAlurB &&
                        d.qtyRamalan !== undefined &&
                        d.qtyRamalan !== null &&
                        d.qty > d.qtyRamalan * 1.5 && (
                          <div className="mt-1">
                            <div className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 font-semibold">
                              <AlertTriangle className="size-3 shrink-0 text-amber-600" />
                              <span>
                                Qty diajukan ({d.qty}) melebihi 150% dari ramalan ({d.qtyRamalan}{" "}
                                {d.unit})
                              </span>
                            </div>
                          </div>
                        )}
                    </td>
                    {isAlurB && (
                      <td className="px-3 py-2 text-center">
                        {d.qtyRamalan !== undefined && d.qtyRamalan !== null ? (
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <span className="font-mono font-bold text-foreground">
                              {d.qtyRamalan} {d.unit}
                            </span>
                            {(d.tanpaModel || d.tanpa_model) && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                baseline
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right font-bold">{d.qty}</td>
                    <td className="px-3 py-2">{d.unit}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{money(d.price)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{money(d.price * d.qty)}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
