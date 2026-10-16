import React, { useState, useEffect, useMemo, useRef } from "react";
import { Sliders, Box, Search, X, Check, Utensils, BookOpen } from "lucide-react";
import { calculateStockDeficit } from "@/lib/utils";
import type {
  ProdiCurriculum,
  RequestDetail,
  LabStockItem,
  MenuItemRecipe,
} from "@/types/procurement";

interface CurriculumCascadingSelectProps {
  curriculum: ProdiCurriculum[];
  selectedProdi: string;
  setSelectedProdi: (val: string) => void;
  selectedSemester: number;
  setSelectedSemester: (val: number) => void;
  selectedCourse: string;
  setSelectedCourse: (val: string) => void;
  selectedMenu: string;
  setSelectedMenu: (val: string) => void;
  groupCount?: number | undefined;
  setGroupCount?: ((val: number) => void) | undefined;
  labStockInventory: Record<string, LabStockItem>;
  onSelectMenuRecipe: (
    menuName: string,
    courseName?: string,
    semesterNum?: number,
    prodiName?: string,
    curriculumData?: ProdiCurriculum[],
    groupMultiplier?: number,
  ) => void;
  setNewDetails: React.Dispatch<React.SetStateAction<RequestDetail[]>>;
}

export const CurriculumCascadingSelect: React.FC<CurriculumCascadingSelectProps> = ({
  curriculum,
  selectedProdi,
  setSelectedProdi,
  selectedSemester,
  setSelectedSemester,
  selectedCourse,
  setSelectedCourse,
  selectedMenu,
  setSelectedMenu,
  groupCount = 1,
  setGroupCount,
  labStockInventory,
  onSelectMenuRecipe,
  setNewDetails,
}) => {
  const [menuSearchQuery, setMenuSearchQuery] = useState(selectedMenu || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync internal search input with selectedMenu prop
  useEffect(() => {
    if (selectedMenu && selectedMenu !== menuSearchQuery) {
      setMenuSearchQuery(selectedMenu);
    }
  }, [selectedMenu]);

  // Close suggestions when clicking outside
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

  const prodiObj = curriculum.find((p) => p.prodiName === selectedProdi);
  const semObj = prodiObj?.semesters.find((s) => s.semester === selectedSemester);
  const courseObj = semObj?.courses.find((c) => c.courseName === selectedCourse);

  // Kumpulkan SEMUA menu masakan dari SELURUH kurikulum (tidak terikat semester)
  const allCurriculumMenus = useMemo(() => {
    const list: {
      menuName: string;
      recipe: MenuItemRecipe;
      courseName: string;
      semester: number;
      prodiName: string;
    }[] = [];
    const seen = new Set<string>();

    curriculum.forEach((p) => {
      p.semesters.forEach((s) => {
        s.courses.forEach((c) => {
          c.menus.forEach((m) => {
            if (!seen.has(m.menuName)) {
              seen.add(m.menuName);
              list.push({
                menuName: m.menuName,
                recipe: m,
                courseName: c.courseName,
                semester: s.semester,
                prodiName: p.prodiName,
              });
            }
          });
        });
      });
    });
    return list;
  }, [curriculum]);

  // Filter menu berdasarkan ketikan pencarian (2/3 huruf atau lebih)
  const filteredMenus = useMemo(() => {
    const q = menuSearchQuery.trim().toLowerCase();
    if (!q) {
      // Jika belum mengetik, tampilkan menu dari course saat ini atau rekomendasi semua menu
      return allCurriculumMenus;
    }

    return allCurriculumMenus.filter((item) => {
      const matchName = item.menuName.toLowerCase().includes(q);
      const matchCourse = item.courseName.toLowerCase().includes(q);
      const matchIngredient = item.recipe.ingredients.some((ing) =>
        ing.name.toLowerCase().includes(q),
      );
      return matchName || matchCourse || matchIngredient;
    });
  }, [allCurriculumMenus, menuSearchQuery]);

  // Temukan resep menu terpilih secara global dari seluruh kurikulum
  const currentMenuObj = useMemo(() => {
    if (!selectedMenu) return undefined;
    // Cek di course saat ini
    const directMenu = courseObj?.menus.find((m) => m.menuName === selectedMenu);
    if (directMenu) return directMenu;

    // Cek di seluruh kurikulum
    for (const p of curriculum) {
      for (const s of p.semesters) {
        for (const c of s.courses) {
          const m = c.menus.find((item) => item.menuName === selectedMenu);
          if (m) return m;
        }
      }
    }
    return undefined;
  }, [curriculum, courseObj, selectedMenu]);

  // Handler memilih menu dari hasil ketik / klik
  const handleSelectMenu = (menuName: string) => {
    setSelectedMenu(menuName);
    setMenuSearchQuery(menuName);
    setIsDropdownOpen(false);
    onSelectMenuRecipe(
      menuName,
      selectedCourse,
      selectedSemester,
      selectedProdi,
      curriculum,
      groupCount,
    );
  };

  // Handler perubahan dropdown kelompok
  const handleGroupCountChange = (newCount: number) => {
    if (setGroupCount) {
      setGroupCount(newCount);
    }
    if (selectedMenu) {
      onSelectMenuRecipe(
        selectedMenu,
        selectedCourse,
        selectedSemester,
        selectedProdi,
        curriculum,
        newCount,
      );
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-surface/80 p-4 space-y-3.5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-black text-foreground uppercase tracking-wide">
          <Sliders className="size-4 text-primary" />
          <span>Pilih Kurikulum & Menu Praktik Memasak:</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* 1. Dropdown Program Studi */}
        <div>
          <label className="block text-[11px] font-bold text-foreground mb-1">
            1. Program Studi (Prodi) <span className="text-red-500"></span>
          </label>
          <select
            value={selectedProdi}
            onChange={(e) => {
              const newProdi = e.target.value;
              setSelectedProdi(newProdi);
              const foundProdi = curriculum.find((p) => p.prodiName === newProdi);
              const foundSem =
                foundProdi?.semesters.find((s) => s.semester === selectedSemester) ||
                foundProdi?.semesters[0];
              const currentSemNum = foundSem ? foundSem.semester : 1;
              setSelectedSemester(currentSemNum);
              const firstCourse = foundSem?.courses[0]?.courseName || "";
              setSelectedCourse(firstCourse);
              if (selectedMenu) {
                onSelectMenuRecipe(
                  selectedMenu,
                  firstCourse,
                  currentSemNum,
                  newProdi,
                  curriculum,
                  groupCount,
                );
              }
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

        {/* 2. Dropdown Semester (1 sampai 8) - Hanya mempengaruhi pilihan mata kuliah */}
        <div>
          <label className="block text-[11px] font-bold text-foreground mb-1">
            2. Semester (1 - 8) <span className="text-red-500"></span>
          </label>
          <select
            value={selectedSemester}
            onChange={(e) => {
              const newSem = Number(e.target.value);
              setSelectedSemester(newSem);
              const foundProdi = curriculum.find((p) => p.prodiName === selectedProdi);
              const foundSem = foundProdi?.semesters.find((s) => s.semester === newSem);
              const firstCourse = foundSem?.courses[0]?.courseName || "";
              setSelectedCourse(firstCourse);
              if (selectedMenu) {
                onSelectMenuRecipe(
                  selectedMenu,
                  firstCourse,
                  newSem,
                  selectedProdi,
                  curriculum,
                  groupCount,
                );
              }
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

        {/* 3. Dropdown Mata Kuliah Praktik (tergantung semester) */}
        <div>
          <label className="block text-[11px] font-bold text-foreground mb-1">
            3. Mata Kuliah Praktik <span className="text-red-500"></span>
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => {
              const newCourse = e.target.value;
              setSelectedCourse(newCourse);
              if (selectedMenu) {
                onSelectMenuRecipe(
                  selectedMenu,
                  newCourse,
                  selectedSemester,
                  selectedProdi,
                  curriculum,
                  groupCount,
                );
              }
            }}
            className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/30"
          >
            {(() => {
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
          <span className="block mt-1 text-[10px] text-muted-foreground">
            Mata kuliah sesuai Semester {selectedSemester}
          </span>
        </div>

        {/* 4. Dropdown Jumlah Kelompok Praktikum (1 Kelompok = 1 Resep) */}
        <div>
          <label className="block text-[11px] font-bold text-foreground mb-1">
            4. Jumlah Kelompok Praktikum
          </label>
          <select
            value={groupCount}
            onChange={(e) => handleGroupCountChange(Number(e.target.value))}
            className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/30"
          >
            <option value={1}>1 Kelompok </option>
            <option value={2}>2 Kelompok </option>
            <option value={3}>3 Kelompok </option>
            <option value={4}>4 Kelompok </option>
            <option value={5}>5 Kelompok </option>
            <option value={6}>6 Kelompok </option>
            <option value={7}>7 Kelompok </option>
            <option value={8}>8 Kelompok </option>
            <option value={9}>9 Kelompok </option>
            <option value={10}>10 Kelompok </option>
          </select>
        </div>
      </div>

      {/* 5. Input Ketik Menu Masakan Praktik dengan Pencarian Cepat (Autocomplete) */}
      <div ref={searchContainerRef} className="relative pt-1">
        <label className="block text-[11px] font-bold text-foreground mb-1">
          5. Menu Masakan Praktik <span className="text-red-500"></span>
        </label>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="size-4" />
          </div>
          <input
            type="text"
            value={menuSearchQuery}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              const val = e.target.value;
              setMenuSearchQuery(val);
              setIsDropdownOpen(true);
            }}
            placeholder="Ketik 2-3 huruf menu masakan... (cth: omelette, pasta, soto, rendang, croissant)"
            className="h-10 w-full pl-9 pr-8 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {menuSearchQuery && (
            <button
              type="button"
              onClick={() => {
                setMenuSearchQuery("");
                setIsDropdownOpen(true);
              }}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
              title="Bersihkan ketikan"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Suggestions Popover List */}
        {isDropdownOpen && (
          <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-card p-1.5 shadow-xl max-h-60 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 flex items-center justify-between">
              <span>Rekomendasi Menu Masakan ({filteredMenus.length} ditemukan)</span>
              <span>Klik untuk memilih</span>
            </div>

            {filteredMenus.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <p className="font-semibold">Menu "{menuSearchQuery}" tidak ditemukan.</p>
                <p className="text-[11px] mt-0.5">
                  Coba kata kunci lain seperti: <em>omelette, soto, pasta, rendang, bolu, steak</em>
                  .
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30 mt-1">
                {filteredMenus.map((item) => {
                  const isSelected = selectedMenu === item.menuName;
                  return (
                    <button
                      key={item.menuName}
                      type="button"
                      onClick={() => handleSelectMenu(item.menuName)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 text-primary font-bold"
                          : "hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Utensils className="size-3.5 text-primary shrink-0" />
                          <span className="font-bold truncate">{item.menuName}</span>
                          {isSelected && (
                            <span className="inline-flex items-center text-[10px] text-primary font-bold bg-primary/20 px-1.5 py-0.2 rounded-full">
                              <Check className="size-3 mr-0.5" /> Terpilih
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground flex items-center gap-2">
                          <span>
                            {item.courseName} (Sem {item.semester})
                          </span>
                          <span>·</span>
                          <span>{item.recipe.ingredients.length} bahan baku</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-foreground/80 font-medium">
                          Pilih
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Selected Menu Badge Info */}
        {selectedMenu && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] text-muted-foreground font-medium">Menu Aktif:</span>
              <strong className="text-primary truncate">{selectedMenu}</strong>
            </div>
            <div className="flex items-center gap-2 shrink-0"></div>
          </div>
        )}
      </div>

      {/* Live Card: Bahan Diperlukan (Resep x Kelompok) vs Stok Lab */}
      {currentMenuObj && (
        <div className="mt-2.5 pt-2.5 border-t border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2"></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {currentMenuObj.ingredients.map((ing) => {
              const neededQtyForGroups = (ing.neededQty || 0) * groupCount;
              const stock = labStockInventory[ing.name]?.stock || 0;
              const deficit = calculateStockDeficit(neededQtyForGroups, stock);
              const isSufficient = stock >= neededQtyForGroups;

              return (
                <div
                  key={ing.name}
                  className={`p-2.5 rounded-lg border text-[11px] flex items-center justify-between transition-colors ${
                    isSufficient
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800"
                      : "bg-rose-50/70 border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold truncate">{ing.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Resep:{" "}
                      <strong>
                        {neededQtyForGroups} {ing.unit}
                        {groupCount > 1
                          ? ` (${groupCount} klp × ${ing.neededQty} ${ing.unit})`
                          : ""}
                      </strong>{" "}
                      · Stok Lab:{" "}
                      <strong>
                        {stock} {ing.unit}
                      </strong>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {isSufficient ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 rounded">
                        Stok Lab Cukup
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100/90 dark:bg-rose-900/60 dark:text-rose-300 px-2 py-0.5 rounded">
                        Kurang: {deficit} {ing.unit}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
