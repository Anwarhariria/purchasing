import React, { useState, useEffect, useMemo, useRef } from "react";
import { PackageCheck, Check, Search, X, Utensils, Box } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LabStockItem } from "@/types/procurement";

const INGREDIENT_MASTER_PRESETS: Record<string, { unit: string; price: number }> = {};

interface StockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStockItem: { name: string; stock: number; unit: string } | null;
  setEditingStockItem: (item: { name: string; stock: number; unit: string } | null) => void;
  labStock: Record<string, LabStockItem>;
  handleSaveStock: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const StockModal: React.FC<StockModalProps> = ({
  open,
  onOpenChange,
  editingStockItem,
  setEditingStockItem,
  labStock,
  handleSaveStock,
}) => {
  const initialName = editingStockItem ? editingStockItem.name : Object.keys(labStock)[0] || "";
  const initialUnit = editingStockItem
    ? editingStockItem.unit
    : labStock[initialName]?.unit || "kg";

  const [searchTerm, setSearchTerm] = useState(initialName);
  const [unit, setUnit] = useState(initialUnit);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync state when editingStockItem or open changes
  useEffect(() => {
    if (editingStockItem) {
      setSearchTerm(editingStockItem.name);
      setUnit(editingStockItem.unit);
    } else {
      const defaultName = Object.keys(labStock)[0] || "";
      setSearchTerm(defaultName);
      setUnit(labStock[defaultName]?.unit || "kg");
    }
    setIsDropdownOpen(false);
  }, [editingStockItem, open]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // List of all available lab stock and master kitchen presets
  const availableStockList = useMemo(() => {
    const list: { name: string; stock: number; unit: string; isExisting: boolean }[] = [];
    const seen = new Set<string>();

    // 1. Bahan yang sudah ada di inventaris lab
    Object.entries(labStock).forEach(([name, data]) => {
      seen.add(name.toLowerCase().trim());
      list.push({ name, stock: data.stock, unit: data.unit, isExisting: true });
    });

    // 2. Preset bahan dapur master
    Object.entries(INGREDIENT_MASTER_PRESETS).forEach(([key, val]) => {
      if (!seen.has(key)) {
        const title = key
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        list.push({ name: title, stock: 0, unit: val.unit, isExisting: false });
      }
    });

    return list;
  }, [labStock]);

  // Filter bahan saat mengetik 2/3 huruf
  const filteredStock = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return availableStockList.slice(0, 12);
    return availableStockList.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 15);
  }, [availableStockList, searchTerm]);

  const selectedStockData = labStock[searchTerm];

  const handleSelectBahan = (name: string, itemUnit: string) => {
    setSearchTerm(name);
    setUnit(itemUnit);
    setIsDropdownOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) setEditingStockItem(null);
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-md rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
              <PackageCheck className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-black text-foreground">
                {editingStockItem
                  ? "Edit Stok Bahan Laboratorium"
                  : "Input Stok Barang Lab (Asdos)"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingStockItem
                  ? "Koreksi nama, jumlah, atau satuan bahan di gudang lab."
                  : "Catat barang belanjaan yang baru tiba atau perbarui sisa bahan pasca praktikum."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSaveStock}
          key={editingStockItem ? editingStockItem.name : "new-stock"}
          className="space-y-4 px-4 sm:px-6 py-4 sm:py-5"
        >
          {/* Hidden inputs to feed handleSaveStock */}
          <input type="hidden" name="selectedName" value={searchTerm} />
          <input type="hidden" name="customName" value={searchTerm} />

          {/* 1. Pilih / Ketik Nama Bahan Masakan (Search Autocomplete Tanpa Dropdown Chevron) */}
          <div ref={searchContainerRef} className="relative">
            <label className="block text-xs font-bold text-foreground mb-1">
              Pilih / Ketik Nama Bahan Masakan <span className="text-red-500"></span>
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                (Ketik 2-3 huruf untuk mencari atau input nama bahan baru)
              </span>
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Search className="size-4" />
              </div>
              <input
                type="text"
                required
                value={searchTerm}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                placeholder="Ketik 2-3 huruf nama bahan... (cth: Beras, Telur, Daging, Minyak)"
                className="h-10 w-full pl-9 pr-8 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setIsDropdownOpen(true);
                  }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Bersihkan teks"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Suggestions Popover List */}
            {isDropdownOpen && (
              <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-card p-1.5 shadow-xl max-h-56 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 flex items-center justify-between">
                  <span>Daftar Bahan ({filteredStock.length} opsi)</span>
                  <span>Klik untuk memilih</span>
                </div>

                {filteredStock.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">"{searchTerm}" (Bahan Baru)</p>
                    <p className="text-[11px] mt-0.5">
                      Bahan ini belum ada di lab. Anda dapat langsung menyimpannya sebagai bahan
                      baru!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30 mt-1">
                    {filteredStock.map((item) => {
                      const isSelected =
                        searchTerm.toLowerCase().trim() === item.name.toLowerCase().trim();
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectBahan(item.name, item.unit);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 text-primary font-bold"
                              : "hover:bg-muted/80 text-foreground"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Utensils className="size-3.5 text-primary shrink-0" />
                              <span className="font-bold truncate">{item.name}</span>
                              {isSelected && (
                                <span className="inline-flex items-center text-[10px] text-primary font-bold bg-primary/20 px-1.5 py-0.2 rounded-full">
                                  <Check className="size-3 mr-0.5" /> Terpilih
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                              {item.isExisting ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Stok Saat Ini: {item.stock} {item.unit}
                                </span>
                              ) : (
                                <span>Master Bahan Standar ({item.unit})</span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-foreground/80 font-medium shrink-0">
                            Pilih
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Item Badge Info */}
            {searchTerm && (
              <div className="mt-2 flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Box className="size-3.5 text-primary shrink-0" />
                  <span className="text-[11px] text-muted-foreground">Bahan:</span>
                  <strong className="text-primary truncate">{searchTerm}</strong>
                </div>
                {selectedStockData ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md shrink-0">
                    Stok Saat Ini: {selectedStockData.stock} {selectedStockData.unit}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md shrink-0">
                    Bahan Baru
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2. Jenis Pencatatan Stok */}
          {!editingStockItem && (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Jenis Pencatatan Stok <span className="text-red-500"></span>
              </label>
              <select
                name="inputType"
                defaultValue="masuk"
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="masuk">Barang Belanjaan Baru Tiba (+ Tambahkan ke Stok)</option>
                <option value="sisa">
                  Sisa Bahan Pasca Praktikum (Tetapkan Sebagai Sisa Stok)
                </option>
                <option value="set">Koreksi / Set Stok Langsung</option>
              </select>
            </div>
          )}

          {/* 3. Kuantitas & Satuan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Jumlah / Kuantitas <span className="text-red-500"></span>
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                name="stock"
                defaultValue={editingStockItem ? editingStockItem.stock : 1}
                required
                placeholder="0"
                className="h-10 text-xs font-black text-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Satuan Ukuran <span className="text-red-500"></span>
              </label>
              <Input
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
                placeholder="kg, liter, butir, pack..."
                className="h-10 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setEditingStockItem(null);
              }}
              className="w-full sm:w-auto text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-primary hover:bg-blue-900 text-white font-bold text-xs w-full sm:w-auto cursor-pointer"
            >
              <Check className="size-4" />
              {editingStockItem ? "Simpan Perubahan" : "Simpan Stok Barang Lab"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
