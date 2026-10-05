import React, { useMemo } from "react";
import { Utensils, Sliders, Box, Plus, Trash2, CheckCircle2, Send, Sparkles } from "lucide-react";
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

// Master Preset Bahan Dapur untuk Autocomplete & Standar Unit/Harga
const INGREDIENT_MASTER_PRESETS: Record<string, { unit: string; price: number }> = {
  "telur ayam negeri": { unit: "butir", price: 2500 },
  "telur bebek": { unit: "butir", price: 3500 },
  "tepung terigu protein tinggi (cakra)": { unit: "kg", price: 15000 },
  "tepung terigu protein sedang (segitiga biru)": { unit: "kg", price: 13500 },
  "tepung terigu protein rendah (kunci)": { unit: "kg", price: 14000 },
  "tepung maizena": { unit: "kg", price: 18000 },
  "tepung tapioka": { unit: "kg", price: 12000 },
  "tepung beras": { unit: "kg", price: 14000 },
  "tepung ketan": { unit: "kg", price: 16000 },
  "tepung panir / panko": { unit: "kg", price: 22000 },
  "beras putih premium": { unit: "kg", price: 16000 },
  "beras ketan putih": { unit: "kg", price: 18000 },
  "daging sapi tenderloin": { unit: "kg", price: 165000 },
  "daging sapi sirloin": { unit: "kg", price: 145000 },
  "daging sapi gandik": { unit: "kg", price: 135000 },
  "daging sapi giling": { unit: "kg", price: 125000 },
  "ayam broiler utuh": { unit: "ekor", price: 38000 },
  "ayam kampung": { unit: "ekor", price: 65000 },
  "daging ayam fillet (dada)": { unit: "kg", price: 55000 },
  "daging ayam fillet (paha)": { unit: "kg", price: 58000 },
  "minyak goreng sawit": { unit: "liter", price: 18500 },
  "minyak wijen": { unit: "botol", price: 32000 },
  "olive oil (extra virgin)": { unit: "botol", price: 85000 },
  "butter elle & vire": { unit: "kg", price: 185000 },
  "butter dry sheet (laminasi)": { unit: "kg", price: 195000 },
  "butter anchor unsalted": { unit: "kg", price: 175000 },
  "margarin blue band": { unit: "kg", price: 42000 },
  "susu uht full cream": { unit: "liter", price: 21000 },
  "cooking cream": { unit: "liter", price: 68000 },
  "heavy cream elle & vire": { unit: "liter", price: 85000 },
  "gula pasir kristal": { unit: "kg", price: 17500 },
  "gula halus / icing sugar": { unit: "kg", price: 22000 },
  "gula merah / aren": { unit: "kg", price: 28000 },
  "garam halus": { unit: "bungkus", price: 5000 },
  "bawang merah & putih": { unit: "kg", price: 45000 },
  "bawang merah brebes": { unit: "kg", price: 42000 },
  "bawang putih kating": { unit: "kg", price: 40000 },
  "bawang bombay": { unit: "kg", price: 35000 },
  "cabai merah keriting": { unit: "kg", price: 52000 },
  "cabai rawit merah": { unit: "kg", price: 65000 },
  "keju cheddar blok": { unit: "blok", price: 26000 },
  "keju parmesan bubuk": { unit: "botol", price: 48000 },
  "keju mozzarella": { unit: "kg", price: 110000 },
  "pasta spaghetti la fonte": { unit: "pack", price: 19500 },
  "pasta fettuccine": { unit: "pack", price: 21000 },
  "ragi instan (yeast)": { unit: "sachet", price: 6000 },
  "santan kelapa kental": { unit: "liter", price: 24000 },
  "santan kental murni": { unit: "liter", price: 25000 },
  "kentang russet import": { unit: "kg", price: 35000 },
  "soun kering": { unit: "bungkus", price: 8000 },
  "tauge segar": { unit: "kg", price: 12000 },
  "kol segar": { unit: "kg", price: 10000 },
  "daun bawang & seledri": { unit: "ikat", price: 8000 },
  "serai & daun pandan": { unit: "ikat", price: 6000 },
  "lengkuas, jahe & serai": { unit: "kg", price: 30000 },
  "jeruk nipis": { unit: "kg", price: 20000 },
  "kecap manis": { unit: "botol", price: 24000 },
  "kecap asin": { unit: "botol", price: 18000 },
  "saus tiram": { unit: "botol", price: 22000 },
};

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
  // Kumpulan Master Bahan untuk Autocomplete & Pencarian Cepat (<datalist>)
  const masterIngredientOptions = useMemo(() => {
    const map = new Map<string, { name: string; extra?: string }>();

    // 1. Dari preset standar dapur
    Object.entries(INGREDIENT_MASTER_PRESETS).forEach(([key, val]) => {
      const title = key
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      map.set(key, { name: title, extra: `${val.unit} · ${money(val.price)}` });
    });

    // 2. Dari stok inventaris laboratorium
    if (labStockInventory) {
      Object.entries(labStockInventory).forEach(([name, item]) => {
        const key = name.toLowerCase().trim();
        map.set(key, {
          name,
          extra: `Stok Lab: ${item.stock} ${item.unit}`,
        });
      });
    }

    // 3. Dari seluruh resep kurikulum masakan
    if (curriculum) {
      curriculum.forEach((p) => {
        p.semesters?.forEach((s) => {
          s.courses?.forEach((c) => {
            c.menus?.forEach((m) => {
              m.ingredients?.forEach((ing) => {
                const key = ing.name.toLowerCase().trim();
                if (!map.has(key)) {
                  const unitPrice = (ing as any).pricePerUnit ?? (ing as any).price ?? 0;
                  map.set(key, {
                    name: ing.name,
                    extra: unitPrice > 0 ? `${ing.unit} · ${money(unitPrice)}` : ing.unit,
                  });
                }
              });
            });
          });
        });
      });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [labStockInventory, curriculum]);

  // Handler update nama bahan dengan auto-fill satuan & estimasi harga jika cocok master data
  const handleDetailNameChange = (index: number, value: string) => {
    const newArr = [...newDetails];
    newArr[index].name = value;

    const normalized = value.toLowerCase().trim();
    const preset = INGREDIENT_MASTER_PRESETS[normalized];
    if (preset) {
      if (!newArr[index].unit || newArr[index].unit === "kg/liter") {
        newArr[index].unit = preset.unit;
      }
      if (!newArr[index].price || newArr[index].price === 0) {
        newArr[index].price = preset.price;
      }
    } else if (labStockInventory && labStockInventory[value]) {
      if (!newArr[index].unit || newArr[index].unit === "kg/liter") {
        newArr[index].unit = labStockInventory[value].unit;
      }
    }

    setNewDetails(newArr);
  };

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
            {/* HTML5 Datalist untuk Autocomplete / Saran Pencarian Bahan Cepat */}
            <datalist id="master-ingredients-datalist">
              {masterIngredientOptions.map((opt) => (
                <option key={opt.name} value={opt.name}>
                  {opt.extra ? `${opt.name} (${opt.extra})` : opt.name}
                </option>
              ))}
            </datalist>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Rincian Bahan yang Harus Dibeli
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold border border-amber-500/20">
                    <Sparkles className="size-2.5" /> Autocomplete Aktif
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ketik huruf awal (misal: "Te...") pada kolom <strong>Nama Barang</strong> untuk memilih bahan otomatis dari master dapur.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 self-start sm:self-auto shrink-0 font-bold cursor-pointer"
                onClick={() =>
                  setNewDetails([
                    ...newDetails,
                    { id: "D-" + Date.now(), name: "", qty: 1, unit: "", price: 0 },
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
                          Nama Barang / Bahan (Autocomplete)
                        </label>
                        <Input
                          required
                          list="master-ingredients-datalist"
                          className="h-8 text-xs font-semibold"
                          placeholder="Ketik nama bahan (contoh: Telur, Tepung)..."
                          value={detail.name}
                          onChange={(e) => handleDetailNameChange(index, e.target.value)}
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
                        <th className="px-3 py-2 font-semibold">
                          <span className="inline-flex items-center gap-1.5">
                            Nama Barang
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-extrabold text-primary">
                              Pencarian Cepat
                            </span>
                          </span>
                        </th>
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
                              list="master-ingredients-datalist"
                              className="h-8 text-xs font-semibold"
                              placeholder="Ketik nama bahan (contoh: Telur, Tepung)..."
                              value={detail.name}
                              onChange={(e) => handleDetailNameChange(index, e.target.value)}
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
