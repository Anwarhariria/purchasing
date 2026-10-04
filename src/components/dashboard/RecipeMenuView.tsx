import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Utensils, Edit, Trash2 } from "lucide-react";
import { money } from "@/lib/algorithms/saw";
import type { StudyProgramData, MenuItemRecipe } from "@/types/procurement";

interface RecipeMenuViewProps {
  curriculum: StudyProgramData[];
  kaprodiSelectedProdi: string;
  setKaprodiSelectedProdi: (p: string) => void;
  kaprodiSelectedSem: number;
  setKaprodiSelectedSem: (s: number) => void;
  kaprodiSelectedCourse: string;
  setKaprodiSelectedCourse: (c: string) => void;
  onOpenAddMenu: (courseName: string) => void;
  onOpenEditMenu: (courseName: string, menu: MenuItemRecipe) => void;
  onDeleteMenu: (courseName: string, menuName: string) => void;
}

export function RecipeMenuView({
  curriculum,
  kaprodiSelectedProdi,
  setKaprodiSelectedProdi,
  kaprodiSelectedSem,
  setKaprodiSelectedSem,
  kaprodiSelectedCourse,
  setKaprodiSelectedCourse,
  onOpenAddMenu,
  onOpenEditMenu,
  onDeleteMenu,
}: RecipeMenuViewProps) {
  const courses =
    curriculum
      .find((p) => p.prodiName === kaprodiSelectedProdi)
      ?.semesters.find((s) => s.semester === kaprodiSelectedSem)?.courses || [];

  const activeCourseObj = courses.find((c) => c.courseName === kaprodiSelectedCourse) || courses[0];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Utensils className="size-5 text-blue-600" />
              Manajemen Menu Hidangan &amp; Resep Bahan (Kaprodi)
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Wewenang penuh Kaprodi: Menambah, mengedit, dan menghapus nama masakan praktik serta menetapkan rincian bahan yang dibutuhkan, takaran (Qty), satuan, dan estimasi harga per unit.
            </p>
          </div>
        </div>

        {/* Cascading Filter Bar: Prodi -> Semester (1-8) -> Mata Kuliah */}
        <div className="mt-5 rounded-lg border border-border bg-surface p-4">
          <div className="text-xs font-black uppercase tracking-wider text-primary mb-3">
            Pilih Mata Kuliah Praktik yang Ingin Dikelola Menunya:
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* 1. Pilih Prodi */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1">1. Program Studi:</label>
              <select
                value={kaprodiSelectedProdi}
                onChange={(e) => {
                  const newP = e.target.value;
                  setKaprodiSelectedProdi(newP);
                  const newCourses =
                    curriculum
                      .find((p) => p.prodiName === newP)
                      ?.semesters.find((s) => s.semester === kaprodiSelectedSem)?.courses || [];
                  setKaprodiSelectedCourse(newCourses[0]?.courseName || "");
                }}
                className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {curriculum.map((p) => (
                  <option key={p.prodiName} value={p.prodiName}>
                    {p.prodiName}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Pilih Semester (1 s/d 8) */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1">2. Semester (1 - 8):</label>
              <select
                value={kaprodiSelectedSem}
                onChange={(e) => {
                  const newS = Number(e.target.value);
                  setKaprodiSelectedSem(newS);
                  const newCourses =
                    curriculum
                      .find((p) => p.prodiName === kaprodiSelectedProdi)
                      ?.semesters.find((s) => s.semester === newS)?.courses || [];
                  setKaprodiSelectedCourse(newCourses[0]?.courseName || "");
                }}
                className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Pilih Mata Kuliah */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1">3. Mata Kuliah Praktik:</label>
              <select
                value={kaprodiSelectedCourse}
                onChange={(e) => setKaprodiSelectedCourse(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {courses.length === 0 ? (
                  <option value="">(Belum ada MK di Semester {kaprodiSelectedSem})</option>
                ) : (
                  courses.map((c) => (
                    <option key={c.courseName} value={c.courseName}>
                      {c.courseName}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Konten Menu & Bahan untuk Mata Kuliah yang Dipilih */}
        <div className="mt-6 border-t border-border pt-5">
          {courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center bg-surface/50">
              <BookOpen className="mx-auto size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-bold text-foreground">
                Tidak ada mata kuliah praktik di Semester {kaprodiSelectedSem} ({kaprodiSelectedProdi}).
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Mata kuliah dapat ditambahkan terlebih dahulu oleh Super Admin melalui menu Master Prodi &amp; Matakuliah.
              </p>
            </div>
          ) : !activeCourseObj ? null : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-md bg-blue-100 text-blue-700 text-xs font-bold">
                      MK
                    </span>
                    {activeCourseObj.courseName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Semester {kaprodiSelectedSem} · {activeCourseObj.menus.length} Menu Hidangan Terdaftar
                  </p>
                </div>
              </div>

              {activeCourseObj.menus.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center bg-surface/50">
                  <Utensils className="mx-auto size-8 text-blue-400 mb-2" />
                  <p className="text-xs font-bold text-foreground">Belum ada menu hidangan untuk mata kuliah ini.</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Silakan gunakan menu mata kuliah lain atau hubungi admin untuk sinkronisasi kurikulum.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCourseObj.menus.map((menu, mIdx) => {
                    const totalRecipeCost = menu.ingredients.reduce(
                      (sum, ing) => sum + ing.neededQty * ing.pricePerUnit,
                      0
                    );

                    return (
                      <div
                        key={menu.menuName + mIdx}
                        className="rounded-xl border border-border bg-card p-4 transition-all hover:border-blue-300 shadow-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
                          <div>
                            <h4 className="text-sm font-extrabold text-foreground">{menu.menuName}</h4>
                            <p className="text-[11px] text-muted-foreground">
                              {menu.ingredients.length} jenis bahan · Total estimasi biaya:{" "}
                              <strong className="text-foreground">{money(totalRecipeCost)}</strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenEditMenu(activeCourseObj.courseName, menu)}
                              className="h-8 gap-1 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer"
                            >
                              <Edit className="size-3.5" />
                              Edit Menu &amp; Bahan
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDeleteMenu(activeCourseObj.courseName, menu.menuName)}
                              className="h-8 gap-1 text-xs font-semibold text-[#0f172a] border-slate-300 hover:bg-slate-100 hover:text-black cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                              Hapus Menu
                            </Button>
                          </div>
                        </div>

                        {/* Rincian Bahan */}
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-[500px] text-left text-xs">
                            <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2 w-10 text-center">No</th>
                                <th className="px-3 py-2">Nama Bahan Masakan</th>
                                <th className="px-3 py-2">Takaran Butuh (Standar Resep)</th>
                                <th className="px-3 py-2">Estimasi Harga Satuan</th>
                                <th className="px-3 py-2 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {menu.ingredients.map((ing, ingIdx) => (
                                <tr key={ing.name + ingIdx} className="hover:bg-surface/50">
                                  <td className="px-3 py-2 text-center text-muted-foreground font-medium">
                                    {ingIdx + 1}
                                  </td>
                                  <td className="px-3 py-2 font-bold text-foreground">{ing.name}</td>
                                  <td className="px-3 py-2 font-semibold text-foreground">
                                    {ing.neededQty} {ing.unit}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground font-mono">
                                    {money(ing.pricePerUnit)} / {ing.unit}
                                  </td>
                                  <td className="px-3 py-2 text-right font-black text-foreground font-mono">
                                    {money(ing.neededQty * ing.pricePerUnit)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
