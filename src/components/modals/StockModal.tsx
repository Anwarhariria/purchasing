import React from "react";
import { PackageCheck, Check } from "lucide-react";
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
          {/* 1. Pilih Bahan Masakan */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Pilih Bahan Masakan <span className="text-red-500">*</span>
            </label>
            {editingStockItem ? (
              <Input
                name="customName"
                defaultValue={editingStockItem.name}
                required
                placeholder="Nama bahan masakan..."
                className="h-10 text-xs font-bold text-foreground"
              />
            ) : (
              <div className="space-y-2">
                <select
                  name="selectedName"
                  defaultValue={Object.keys(labStock)[0] || ""}
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  {Object.entries(labStock).map(([name, data]) => (
                    <option key={name} value={name}>
                      {name} (Stok Saat Ini: {data.stock} {data.unit})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Atau ketik nama bahan baru di bawah jika belum terdaftar:
                </p>
                <Input
                  name="customName"
                  placeholder="Ketik nama bahan baru jika tidak ada di daftar atas..."
                  className="h-9 text-xs"
                />
              </div>
            )}
          </div>

          {/* 2. Jenis Inputan */}
          {!editingStockItem && (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Jenis Pencatatan Stok <span className="text-red-500">*</span>
              </label>
              <select
                name="inputType"
                defaultValue="masuk"
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="masuk">Barang Belanjaan Baru Tiba (+ Tambahkan ke Stok)</option>
                <option value="sisa">Sisa Bahan Pasca Praktikum (Tetapkan Sebagai Sisa Stok)</option>
                <option value="set">Koreksi / Set Stok Langsung</option>
              </select>
            </div>
          )}

          {/* 3. Kuantitas & Satuan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Jumlah / Kuantitas <span className="text-red-500">*</span>
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
                Satuan Ukuran <span className="text-red-500">*</span>
              </label>
              <Input
                name="unit"
                defaultValue={editingStockItem ? editingStockItem.unit : "kg"}
                required
                placeholder="kg, liter, butir, pack..."
                className="h-10 text-xs font-medium"
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
