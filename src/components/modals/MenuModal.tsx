import React from "react";
import { Utensils, Package, Plus, Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/algorithms/saw";
import type { Ingredient } from "@/types/procurement";

interface MenuModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMenuName: string | null;
  kaprodiSelectedCourse: string;
  kaprodiSelectedSem: number;
  kaprodiSelectedProdi: string;
  menuFormName: string;
  setMenuFormName: (val: string) => void;
  menuFormIngredients: Ingredient[];
  setMenuFormIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  handleSaveMenu: (e: React.FormEvent<HTMLFormElement>) => void;
  notify: (msg: string) => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  open,
  onOpenChange,
  editingMenuName,
  kaprodiSelectedCourse,
  kaprodiSelectedSem,
  kaprodiSelectedProdi,
  menuFormName,
  setMenuFormName,
  menuFormIngredients,
  setMenuFormIngredients,
  handleSaveMenu,
  notify,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0">
              <Utensils className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-black text-foreground">
                {editingMenuName
                  ? "Edit Menu & Resep Bahan Masakan"
                  : "Tambah Menu & Resep Bahan Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Mata Kuliah: <strong>{kaprodiSelectedCourse}</strong> (Semester {kaprodiSelectedSem} · {kaprodiSelectedProdi})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSaveMenu} className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
          <label className="block text-xs font-bold text-foreground">
            Nama Hidangan / Menu Masakan Praktik <span className="text-red-500">*</span>
            <Input
              required
              value={menuFormName}
              onChange={(e) => setMenuFormName(e.target.value)}
              placeholder="Contoh: Nasi Liwet Sunda Komplit & Ayam Lengkuas"
              className="mt-1.5 h-10 font-semibold"
            />
          </label>

          {/* Rincian Bahan yang Dibutuhkan */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Package className="size-3.5 text-blue-600" />
                  Daftar Kebutuhan Bahan Resep:
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Tentukan bahan apa saja yang dibutuhkan beserta takaran standar per porsi praktikum.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setMenuFormIngredients([
                    ...menuFormIngredients,
                    { name: "", neededQty: 1, unit: "kg", pricePerUnit: 15000 },
                  ])
                }
                className="h-7 text-xs gap-1 font-bold text-blue-700 border-blue-200 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-950/40 self-start sm:self-auto shrink-0 cursor-pointer"
              >
                <Plus className="size-3" /> Tambah Baris Bahan
              </Button>
            </div>

            {/* TAMPILAN MOBILE: Card Stack */}
            <div className="space-y-2.5 sm:hidden">
              {menuFormIngredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-border bg-surface/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      Bahan #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (menuFormIngredients.length <= 1) {
                          notify("Minimal harus ada satu bahan.");
                          return;
                        }
                        setMenuFormIngredients((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="text-muted-foreground hover:text-rose-600 transition-colors p-1"
                      title="Hapus baris ini"
                    >
                      <Trash2 className="size-3.5 text-rose-500" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground">
                      Nama Bahan
                    </label>
                    <Input
                      required
                      placeholder="Contoh: Beras Pandan Wangi..."
                      value={ing.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMenuFormIngredients((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                        );
                      }}
                      className="h-8 text-xs font-medium mt-0.5"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground">
                        Jumlah (Qty)
                      </label>
                      <Input
                        type="number"
                        required
                        min="0.1"
                        step="0.1"
                        value={ing.neededQty || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMenuFormIngredients((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, neededQty: val } : item))
                          );
                        }}
                        className="h-8 text-xs font-bold mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground">Satuan</label>
                      <Input
                        required
                        placeholder="kg/liter"
                        value={ing.unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMenuFormIngredients((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, unit: val } : item))
                          );
                        }}
                        className="h-8 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground">
                        Harga/Unit
                      </label>
                      <Input
                        type="number"
                        required
                        min="0"
                        step="500"
                        value={ing.pricePerUnit || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMenuFormIngredients((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, pricePerUnit: val } : item))
                          );
                        }}
                        className="h-8 text-xs font-mono mt-0.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                    <span className="text-[11px] text-muted-foreground">Subtotal:</span>
                    <span className="font-bold font-mono text-foreground">
                      {money(ing.neededQty * ing.pricePerUnit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* TAMPILAN DESKTOP: Tabel Lengkap */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[550px] text-left text-xs">
                <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Nama Bahan Masakan</th>
                    <th className="px-3 py-2 w-24">Takaran (Qty)</th>
                    <th className="px-3 py-2 w-24">Satuan</th>
                    <th className="px-3 py-2 w-32">Harga Satuan</th>
                    <th className="px-3 py-2 text-right w-28">Subtotal</th>
                    <th className="px-3 py-2 w-10 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {menuFormIngredients.map((ing, idx) => (
                    <tr key={idx} className="hover:bg-surface/50">
                      <td className="px-3 py-2">
                        <Input
                          required
                          placeholder="Nama bahan..."
                          value={ing.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMenuFormIngredients((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                            );
                          }}
                          className="h-8 text-xs font-medium"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          required
                          min="0.1"
                          step="0.1"
                          value={ing.neededQty || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setMenuFormIngredients((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, neededQty: val } : item))
                            );
                          }}
                          className="h-8 text-xs font-bold"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          required
                          placeholder="kg, liter, ikat"
                          value={ing.unit}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMenuFormIngredients((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, unit: val } : item))
                            );
                          }}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          required
                          min="0"
                          step="500"
                          value={ing.pricePerUnit || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setMenuFormIngredients((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, pricePerUnit: val } : item))
                            );
                          }}
                          className="h-8 text-xs font-mono"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-black font-mono text-foreground">
                        {money(ing.neededQty * ing.pricePerUnit)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (menuFormIngredients.length <= 1) {
                              notify("Minimal harus ada satu bahan.");
                              return;
                            }
                            setMenuFormIngredients((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-muted-foreground hover:text-rose-600 transition-colors"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="size-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Estimasi Resep */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border text-xs">
              <span className="font-semibold text-muted-foreground">
                Total {menuFormIngredients.length} Macam Bahan:
              </span>
              <span className="text-sm font-black text-blue-700 dark:text-blue-400">
                {money(
                  menuFormIngredients.reduce(
                    (sum, ing) => sum + ing.neededQty * ing.pricePerUnit,
                    0
                  )
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md w-full sm:w-auto cursor-pointer"
            >
              <Check className="size-4" />
              {editingMenuName ? "Simpan Perubahan Menu & Bahan" : "Simpan Menu & Resep Baru"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
