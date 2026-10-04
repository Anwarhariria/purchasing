import React from "react";
import { Utensils, Sliders, Box, Plus, Trash2, CheckCircle2, Send } from "lucide-react";
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
import type { ProdiCurriculum, RequestDetail, LabStockItem } from "@/types/procurement";

interface CreateRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curriculum: ProdiCurriculum[];
  selectedProdi: string;
  setSelectedProdi: (val: string) => void;
  selectedSemester: number;
  setSelectedSemester: (val: number) => void;
  selectedCourse: string;
  setSelectedCourse: (val: string) => void;
  selectedMenu: string;
  setSelectedMenu: (val: string) => void;
  newDetails: RequestDetail[];
  setNewDetails: React.Dispatch<React.SetStateAction<RequestDetail[]>>;
  onSelectMenuRecipe: (menuName: string, courseName?: string, semesterNum?: number, prodiName?: string) => void;
  handleCreateRequest: (e: React.FormEvent<HTMLFormElement>) => void;
  labStockInventory: Record<string, LabStockItem>;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  open,
  onOpenChange,
  curriculum,
  selectedProdi,
  setSelectedProdi,
  selectedSemester,
  setSelectedSemester,
  selectedCourse,
  setSelectedCourse,
  selectedMenu,
  setSelectedMenu,
  newDetails,
  setNewDetails,
  onSelectMenuRecipe,
  handleCreateRequest,
  labStockInventory,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-2xl overflow-y-auto rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
              <Utensils className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                Ajukan Kebutuhan Bahan Praktik Masak
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pilih kurikulum & menu masakan. Sistem akan menghitung otomatis defisit bahan sesuai stok lab.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleCreateRequest} className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
          {/* CASCADING DROPDOWNS: Prodi -> Semester -> Matakuliah -> Menu Masak */}
          <div className="rounded-xl border border-border/80 bg-surface/80 p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase tracking-wide">
              <Sliders className="size-4 text-muted-foreground" />
              <span>Pilih Kurikulum & Menu Praktik Memasak:</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* 1. Dropdown Program Studi */}
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  1. Program Studi (Prodi) <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProdi}
                  onChange={(e) => {
                    const newProdi = e.target.value;
                    setSelectedProdi(newProdi);
                    const prodiObj = curriculum.find((p) => p.prodiName === newProdi);
                    const semObj =
                      prodiObj?.semesters.find((s) => s.semester === selectedSemester) ||
                      prodiObj?.semesters[0];
                    const currentSemNum = semObj ? semObj.semester : 1;
                    setSelectedSemester(currentSemNum);
                    const firstCourse = semObj?.courses[0]?.courseName || "";
                    setSelectedCourse(firstCourse);
                    const firstMenu = semObj?.courses[0]?.menus[0]?.menuName || "";
                    setSelectedMenu(firstMenu);
                    if (firstMenu) onSelectMenuRecipe(firstMenu, firstCourse, currentSemNum, newProdi);
                    else setNewDetails([]);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/30"
                >
                  {curriculum.map((p) => (
                    <option key={p.prodiName} value={p.prodiName}>
                      {p.prodiName}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Dropdown Semester (1 sampai 8) */}
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  2. Semester (1 - 8) <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => {
                    const newSem = Number(e.target.value);
                    setSelectedSemester(newSem);
                    const prodiObj = curriculum.find((p) => p.prodiName === selectedProdi);
                    const semObj = prodiObj?.semesters.find((s) => s.semester === newSem);
                    const firstCourse = semObj?.courses[0]?.courseName || "";
                    setSelectedCourse(firstCourse);
                    const firstMenu = semObj?.courses[0]?.menus[0]?.menuName || "";
                    setSelectedMenu(firstMenu);
                    if (firstMenu) onSelectMenuRecipe(firstMenu, firstCourse, newSem, selectedProdi);
                    else setNewDetails([]);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/30"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Dropdown Mata Kuliah Praktik */}
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  3. Mata Kuliah Praktik <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    const newCourse = e.target.value;
                    setSelectedCourse(newCourse);
                    const prodiObj = curriculum.find((p) => p.prodiName === selectedProdi);
                    const semObj = prodiObj?.semesters.find((s) => s.semester === selectedSemester);
                    const courseObj = semObj?.courses.find((c) => c.courseName === newCourse);
                    const firstMenu = courseObj?.menus[0]?.menuName || "";
                    setSelectedMenu(firstMenu);
                    if (firstMenu) onSelectMenuRecipe(firstMenu, newCourse, selectedSemester, selectedProdi);
                    else setNewDetails([]);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/30"
                >
                  {(() => {
                    const semObj = curriculum
                      .find((p) => p.prodiName === selectedProdi)
                      ?.semesters.find((s) => s.semester === selectedSemester);
                    const courses = semObj?.courses || [];
                    if (courses.length === 0) {
                      return (
                        <option value="">
                          (Belum ada mata kuliah praktik di Semester {selectedSemester})
                        </option>
                      );
                    }
                    return courses.map((c) => (
                      <option key={c.courseName} value={c.courseName}>
                        {c.courseName}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              {/* 4. Dropdown Menu Praktik Masak */}
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  4. Menu Masakan Praktik <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMenu}
                  onChange={(e) => onSelectMenuRecipe(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/30"
                >
                  {(() => {
                    const prodiObj = curriculum.find((p) => p.prodiName === selectedProdi);
                    const semObj = prodiObj?.semesters.find((s) => s.semester === selectedSemester);
                    const courseObj = semObj?.courses.find((c) => c.courseName === selectedCourse);
                    const menus = courseObj?.menus || [];
                    if (menus.length === 0) {
                      return (
                        <option value="">
                          (Belum ada menu masakan terdaftar - Dikelola Kaprodi)
                        </option>
                      );
                    }
                    return menus.map((m) => (
                      <option key={m.menuName} value={m.menuName}>
                        {m.menuName}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            </div>

            {/* Live Card: Bahan Diperlukan vs Stok Lab */}
            {(() => {
              const prodiObj = curriculum.find((p) => p.prodiName === selectedProdi);
              const semObj = prodiObj?.semesters.find((s) => s.semester === selectedSemester);
              const courseObj = semObj?.courses.find((c) => c.courseName === selectedCourse);
              const currentMenuObj = courseObj?.menus.find((m) => m.menuName === selectedMenu);

              if (!currentMenuObj) return null;

              return (
                <div className="mt-2.5 pt-2.5 border-t border-border/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Box className="size-3.5 text-muted-foreground" />
                      Kebutuhan Resep ({selectedMenu}) vs Ketersediaan Stok Lab:
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Otomatis mengisi kekurangan belanja
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {currentMenuObj.ingredients.map((ing) => {
                      const stock = labStockInventory[ing.name]?.stock || 0;
                      const deficit = Math.max(0, ing.neededQty - stock);
                      const isSufficient = stock >= ing.neededQty;

                      return (
                        <div
                          key={ing.name}
                          className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                            isSufficient
                              ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800"
                              : "bg-rose-50/70 border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold truncate">{ing.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Resep: <strong>{ing.neededQty} {ing.unit}</strong> · Stok Lab:{" "}
                              <strong>{stock} {ing.unit}</strong>
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            {isSufficient ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                                Stok Lab Cukup
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded">
                                Kurang: {deficit} {ing.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-foreground">
              Tenggat Praktikum <span className="text-red-500">*</span>
              <Input
                type="date"
                name="deadline"
                required
                defaultValue={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
                className="mt-1.5 h-10 font-normal"
              />
            </label>

            <label className="text-xs font-bold text-foreground">
              Kepentingan Akademik
              <select
                name="academicImportance"
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-card px-3 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="Tinggi">Tinggi (Ujian / Praktik Inti Kurikulum)</option>
                <option value="Sedang">Sedang (Praktik Reguler Mingguan)</option>
                <option value="Standar">Standar (Praktik Tambahan / Mandiri)</option>
              </select>
            </label>

            <label className="sm:col-span-2 text-xs font-bold text-foreground">
              Tujuan / Keterangan Sesi Praktikum
              <Input
                name="purpose"
                placeholder={`Contoh: Praktik memasak ${selectedMenu} sesi laboratorium semester berjalan`}
                className="mt-1.5 h-10 font-normal"
              />
            </label>
          </div>

          {/* Dynamic Items: Mobile Cards (<sm) + Desktop Table (sm+) */}
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                  Rincian Bahan yang Harus Dibeli
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Daftar kekurangan bahan dari resep. Anda dapat menyesuaikan harga satuan atau menambah item bila diperlukan.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 self-start sm:self-auto shrink-0 font-bold"
                onClick={() =>
                  setNewDetails([
                    ...newDetails,
                    { id: "D-" + Date.now(), name: "", qty: 1, unit: "kg", price: 0 },
                  ])
                }
              >
                <Plus className="size-3" /> Tambah Bahan
              </Button>
            </div>

            {newDetails.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-center text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                <p className="font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Semua bahan untuk menu ini sudah tersedia lengkap di stok laboratorium!
                </p>
                <p className="mt-1 text-[11px] text-emerald-800 dark:text-emerald-400">
                  Tidak ada defisit belanja. Jika Anda memerlukan bahan tambahan atau porsi cadangan ekstra, klik tombol <strong>+ Tambah Bahan</strong> di atas.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile View: Clean Compact Cards */}
                <div className="space-y-2.5 sm:hidden">
                  {newDetails.map((detail, index) => (
                    <div
                      key={detail.id}
                      className="rounded-lg border border-border bg-card p-3 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          Bahan #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            setNewDetails(newDetails.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-foreground block mb-1">
                          Nama Bahan
                        </label>
                        <Input
                          required
                          className="h-8 text-xs font-semibold"
                          placeholder="Nama bahan masakan..."
                          value={detail.name}
                          onChange={(e) => {
                            const newArr = [...newDetails];
                            newArr[index].name = e.target.value;
                            setNewDetails(newArr);
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                            Jumlah
                          </label>
                          <Input
                            type="number"
                            required
                            min="0.1"
                            step="any"
                            className="h-8 text-xs font-bold text-foreground"
                            value={detail.qty || ""}
                            onChange={(e) => {
                              const newArr = [...newDetails];
                              newArr[index].qty = Number(e.target.value);
                              setNewDetails(newArr);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                            Satuan
                          </label>
                          <Input
                            required
                            className="h-8 text-xs"
                            placeholder="kg/liter"
                            value={detail.unit}
                            onChange={(e) => {
                              const newArr = [...newDetails];
                              newArr[index].unit = e.target.value;
                              setNewDetails(newArr);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                            Harga (Rp)
                          </label>
                          <Input
                            type="number"
                            required
                            min="0"
                            step="500"
                            className="h-8 text-xs font-mono"
                            value={detail.price || ""}
                            onChange={(e) => {
                              const newArr = [...newDetails];
                              newArr[index].price = Number(e.target.value);
                              setNewDetails(newArr);
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 text-[11px] border-t border-border/60">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-extrabold text-foreground">
                          {money(detail.price * detail.qty)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden sm:block overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Nama Barang</th>
                        <th className="px-3 py-2 font-semibold w-20">Jml</th>
                        <th className="px-3 py-2 font-semibold w-24">Satuan</th>
                        <th className="px-3 py-2 font-semibold w-32">Harga Satuan</th>
                        <th className="px-3 py-2 font-semibold w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-border">
                      {newDetails.map((detail, index) => (
                        <tr key={detail.id}>
                          <td className="px-2 py-2">
                            <Input
                              required
                              className="h-8 text-xs font-semibold"
                              placeholder="Nama bahan masakan..."
                              value={detail.name}
                              onChange={(e) => {
                                const newArr = [...newDetails];
                                newArr[index].name = e.target.value;
                                setNewDetails(newArr);
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              required
                              min="0.1"
                              step="any"
                              className="h-8 text-xs font-bold text-foreground"
                              value={detail.qty || ""}
                              onChange={(e) => {
                                const newArr = [...newDetails];
                                newArr[index].qty = Number(e.target.value);
                                setNewDetails(newArr);
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              required
                              className="h-8 text-xs"
                              placeholder="kg/liter/pack"
                              value={detail.unit}
                              onChange={(e) => {
                                const newArr = [...newDetails];
                                newArr[index].unit = e.target.value;
                                setNewDetails(newArr);
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              required
                              min="0"
                              step="500"
                              className="h-8 text-xs"
                              value={detail.price || ""}
                              onChange={(e) => {
                                const newArr = [...newDetails];
                                newArr[index].price = Number(e.target.value);
                                setNewDetails(newArr);
                              }}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => {
                                setNewDetails(newDetails.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="mt-3 flex justify-end">
              <div className="text-xs sm:text-sm bg-surface px-4 py-2 rounded-md border border-border w-full sm:w-auto text-center sm:text-right">
                Total Estimasi Anggaran Belanja:{" "}
                <span className="font-extrabold text-foreground">
                  {money(newDetails.reduce((sum, d) => sum + d.price * d.qty, 0))}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-primary hover:bg-blue-900 text-white font-bold w-full sm:w-auto cursor-pointer"
            >
              <Send className="size-4" /> Ajukan ke Koordinator Lab
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
