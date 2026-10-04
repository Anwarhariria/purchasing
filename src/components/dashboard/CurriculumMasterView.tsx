import { Button } from "@/components/ui/button";
import { Building2, Plus, Trash2, BookOpen, Edit } from "lucide-react";
import type { StudyProgramData } from "@/types/procurement";

interface CurriculumMasterViewProps {
  curriculum: StudyProgramData[];
  adminSelectedProdi: string;
  setAdminSelectedProdi: (p: string) => void;
  adminSelectedSem: number;
  setAdminSelectedSem: (s: number) => void;
  onOpenAddProdi: () => void;
  onDeleteProdi: (prodiName: string) => void;
  onOpenAddCourse: (sem: number) => void;
  onOpenEditCourse: (courseName: string) => void;
  onDeleteCourse: (courseName: string) => void;
}

export function CurriculumMasterView({
  curriculum,
  adminSelectedProdi,
  setAdminSelectedProdi,
  adminSelectedSem,
  setAdminSelectedSem,
  onOpenAddProdi,
  onDeleteProdi,
  onOpenAddCourse,
  onOpenEditCourse,
  onDeleteCourse,
}: CurriculumMasterViewProps) {
  const currentSemCourses =
    curriculum
      .find((p) => p.prodiName === adminSelectedProdi)
      ?.semesters.find((s) => s.semester === adminSelectedSem)?.courses || [];

  return (
    <div className="space-y-6">
      <div className="animate-slide-up-fade stagger-2 rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              Master Program Studi &amp; Mata Kuliah Praktik
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Kelola Program Studi (Jurusan) dan seluruh mata kuliah praktik dari Semester 1 sampai 8 untuk kegiatan laboratorium.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onOpenAddProdi}
              className="h-9 gap-1.5 bg-primary text-primary-foreground font-bold text-xs shadow-xs cursor-pointer"
            >
              <Plus className="size-4" />
              + Tambah Prodi Baru
            </Button>
          </div>
        </div>

        {/* Selector Program Studi */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface p-3.5 border border-border">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-foreground">Pilih Program Studi:</label>
            <div className="flex flex-wrap gap-2">
              {curriculum.map((p) => (
                <button
                  key={p.prodiName}
                  type="button"
                  onClick={() => setAdminSelectedProdi(p.prodiName)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    adminSelectedProdi === p.prodiName
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-muted-foreground hover:text-foreground border-border"
                  }`}
                >
                  {p.prodiName}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteProdi(adminSelectedProdi)}
            className="h-8 gap-1 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 hover:text-rose-700 font-semibold cursor-pointer"
            title="Hapus Program Studi ini beserta seluruh mata kuliahnya"
          >
            <Trash2 className="size-3.5" />
            Hapus Prodi Terpilih
          </Button>
        </div>

        {/* Tabs Semester 1 s/d 8 */}
        <div className="mt-5">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Pilih Semester Praktik (Semester 1 sampai 8):
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((semNum) => {
              const courseCount =
                curriculum
                  .find((p) => p.prodiName === adminSelectedProdi)
                  ?.semesters.find((s) => s.semester === semNum)?.courses.length || 0;
              const isSelected = adminSelectedSem === semNum;
              return (
                <button
                  key={semNum}
                  type="button"
                  onClick={() => setAdminSelectedSem(semNum)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-black shadow-xs ring-2 ring-primary/20"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <span className="font-bold">Sem {semNum}</span>
                  <span
                    className={`mt-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      courseCount > 0
                        ? isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                        : "bg-muted/30 text-muted-foreground/60"
                    }`}
                  >
                    {courseCount} MK
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daftar Mata Kuliah Praktik di Semester Terpilih */}
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                Mata Kuliah Praktik: Semester {adminSelectedSem} ({adminSelectedProdi})
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Saat Staf memilih Semester {adminSelectedSem} di form pengajuan, hanya mata kuliah ini yang akan muncul di dropdown.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => onOpenAddCourse(adminSelectedSem)}
              className="h-8 gap-1.5 bg-primary hover:bg-blue-900 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              + Tambah Mata Kuliah (Sem {adminSelectedSem})
            </Button>
          </div>

          {currentSemCourses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center bg-surface/50">
              <BookOpen className="mx-auto size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-bold text-foreground">
                Belum ada mata kuliah praktik terdaftar di Semester {adminSelectedSem}.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Klik tombol "+ Tambah Mata Kuliah (Sem {adminSelectedSem})" untuk menambahkan mata kuliah praktik baru.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">No</th>
                    <th className="px-4 py-3">Nama Mata Kuliah Praktik</th>
                    <th className="px-4 py-3">Jumlah Menu Terdaftar (Dikelola Kaprodi)</th>
                    <th className="px-4 py-3 text-right">Tindakan Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentSemCourses.map((c, idx) => (
                    <tr
                      key={c.courseName + idx}
                      className="animate-row-enter hover:bg-surface/60 transition-colors"
                      style={{ animationDelay: `${idx * 25}ms` }}
                    >
                      <td className="px-4 py-3 text-center font-bold text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          {c.courseName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-400">
                          {c.menus.length} Hidangan
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenEditCourse(c.courseName)}
                            className="h-7 text-xs gap-1 font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <Edit className="size-3" /> Edit Nama
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDeleteCourse(c.courseName)}
                            className="h-7 text-xs gap-1 font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 cursor-pointer"
                          >
                            <Trash2 className="size-3" /> Hapus MK
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
