import React, { useState, useEffect } from "react";
import { Utensils, Send, Package, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateRequestTotals, money, formatUnitLabel, localDateInput } from "@/lib/utils";
import { SpakeApi } from "@/lib/api-client";
import {
  type ProdiCurriculum,
  type RequestDetail,
  type LabStockItem,
  type WorkflowType,
  type UserAccount,
} from "@/types/procurement";
import { CurriculumCascadingSelect } from "./create-request/CurriculumCascadingSelect";
import { RequestDetailsEditor } from "./create-request/RequestDetailsEditor";
import { KatalogSearch, type ModalKatalogItem } from "@/components/ui/katalog-search";

interface CreateRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: WorkflowType;
  curriculum: ProdiCurriculum[];
  selectedProdi: string;
  setSelectedProdi: (val: string) => void;
  selectedSemester: number;
  setSelectedSemester: (val: number) => void;
  selectedCourse: string;
  setSelectedCourse: (val: string) => void;
  selectedMenu: string;
  setSelectedMenu: (val: string) => void;
  groupCount?: number;
  setGroupCount?: (val: number) => void;
  newDetails: RequestDetail[];
  setNewDetails: React.Dispatch<React.SetStateAction<RequestDetail[]>>;
  onSelectMenuRecipe: (
    menuName: string,
    courseName?: string,
    semesterNum?: number,
    prodiName?: string,
    customCurriculum?: ProdiCurriculum[],
    multiplier?: number,
  ) => void;
  handleCreateRequest: (e: React.FormEvent<HTMLFormElement>) => void;
  labStockInventory: Record<string, LabStockItem>;
  currentUser?: UserAccount | null;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  open,
  onOpenChange,
  workflow = "A",
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
  newDetails,
  setNewDetails,
  onSelectMenuRecipe,
  handleCreateRequest,
  labStockInventory,
  currentUser,
}) => {
  // Data Katalog Barang untuk Alur B (Logistik & ATK)
  const [katalogList, setKatalogList] = useState<ModalKatalogItem[]>([]);
  const [isLoadingKatalog, setIsLoadingKatalog] = useState<boolean>(false);

  useEffect(() => {
    if (open && workflow === "B") {
      setIsLoadingKatalog(true);
      SpakeApi.getKatalogBarang(true)
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setKatalogList(res.data as unknown as ModalKatalogItem[]);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingKatalog(false);
        });
    }
  }, [open, workflow]);

  // Sinkronkan harga acuan, satuan, dan code_id untuk item dari katalog jika belum lengkap (mis. draf ramalan)
  // JANGAN menimpa price/unit yang sudah diisi user.
  useEffect(() => {
    if (katalogList.length > 0 && workflow === "B" && newDetails.length > 0) {
      setNewDetails((prev) =>
        prev.map((d) => {
          const match = katalogList.find(
            (k) =>
              (d.code_id && (String(k.id) === String(d.code_id) || k.kode === d.code_id)) ||
              (d.name && k.nama.toLowerCase() === d.name.toLowerCase()),
          );
          if (match) {
            const needsCodeId = !d.code_id;
            const needsUnit = !d.unit || d.unit.trim() === "" || d.unit === "-";
            const needsPrice = !d.price || Number(d.price) <= 0;
            if (needsCodeId || needsUnit || needsPrice) {
              return {
                ...d,
                code_id: d.code_id || String(match.id),
                name: d.name || match.nama,
                unit: needsUnit ? match.satuan : d.unit,
                price: needsPrice ? Number(match.harga_acuan) : d.price,
              };
            }
          }
          return d;
        }),
      );
    }
  }, [katalogList, workflow, newDetails.length, setNewDetails]);

  // Pastikan form Alur B memiliki minimal 1 item siap diisi
  useEffect(() => {
    if (open && workflow === "B" && newDetails.length === 0) {
      setNewDetails([{ id: "D-" + Date.now(), code_id: "", name: "", qty: 1, unit: "", price: 0 }]);
    }
  }, [open, workflow, newDetails.length, setNewDetails]);

  const hasUnselectedAlurBItem =
    workflow === "B" &&
    (newDetails.length === 0 ||
      newDetails.some(
        (d) =>
          !d.name ||
          !d.name.trim() ||
          !d.qty ||
          Number(d.qty) <= 0 ||
          !d.unit ||
          !d.unit.trim() ||
          d.unit === "-" ||
          !d.price ||
          Number(d.price) <= 0,
      ));

  const currentTotal = calculateRequestTotals(newDetails).totalPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-2xl overflow-y-auto rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-8 items-center justify-center rounded-lg text-white ${
                workflow === "B" ? "bg-blue-600" : "bg-primary"
              }`}
            >
              {workflow === "B" ? <Package className="size-4" /> : <Utensils className="size-4" />}
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                {workflow === "B"
                  ? "Form Pengajuan Kebutuhan Barang "
                  : "Ajukan Kebutuhan Bahan Praktik Masak "}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {workflow === "B"
                  ? "Formulir permohonan pengadaan barang operasional untuk unit kerja Anda."
                  : "Pilih kurikulum & menu masakan. Sistem akan menghitung otomatis defisit bahan sesuai stok lab."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleCreateRequest} className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
          {/* JIKA ALUR B: FORM LANGSUNG PENGAJUAN BARANG */}
          {workflow === "B" ? (
            <>
              {/* Unit Kerja Info Otomatis dari Akun Pengguna */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 p-3 border border-blue-200/60 dark:border-blue-900/40">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Unit Kerja Pemohon:
                  </span>
                  <span className="rounded-md bg-blue-600 text-white px-2 py-0.5 text-xs font-bold shadow-xs">
                    {formatUnitLabel(currentUser?.department) || "Penerimaan Mahasiswa Baru (PMB)"}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Akun:{" "}
                  <strong className="text-foreground">{currentUser?.name || "Staf Unit"}</strong>
                </span>
              </div>

              {/* Tanggal Dibutuhkan & Keperluan Pengadaan */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-foreground">
                    Tanggal Dibutuhkan <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    name="deadline"
                    required
                    min={localDateInput(0)}
                    defaultValue={localDateInput(2)}
                    className="mt-1.5 h-10 font-normal"
                  />
                  <span className="block mt-1 text-[11px] text-muted-foreground">
                    Pilih tanggal barang diharapkan tiba di unit kerja.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground">
                    Keperluan / Tujuan Pengadaan <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="purpose"
                    required
                    placeholder="Misal: untuk ujian, kepentingan perpus, perlengkapan PMB..."
                    className="mt-1.5 h-10 font-normal text-xs"
                  />
                  <span className="block mt-1 text-[11px] text-muted-foreground">
                    Alasan atau peruntukan barang logistik/ATK ini.
                  </span>
                </div>
              </div>

              {/* Rincian Barang yang Diajukan Langsung di Form */}
              <div className="space-y-3 rounded-xl border border-blue-200/80 bg-blue-50/40 p-3.5 sm:p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2.5 dark:border-blue-900/40">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Rincian Barang yang Diajukan
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Input nama pesanan, jumlah, satuan, dan estimasi harga barang.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNewDetails([
                        ...newDetails,
                        {
                          id: "D-" + Date.now(),
                          code_id: "",
                          name: "",
                          qty: 1,
                          unit: "",
                          price: 0,
                        },
                      ])
                    }
                    className="h-7 text-xs font-bold gap-1 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40 border-blue-300 cursor-pointer"
                  >
                    <Plus className="size-3" /> Tambah Barang Lain
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {newDetails.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">
                          Barang #{idx + 1}
                        </span>
                        {newDetails.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setNewDetails(newDetails.filter((_, i) => i !== idx))}
                            className="size-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Hapus barang ini"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-12">
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-bold text-foreground block mb-1">
                            Pilih Barang dari Katalog <span className="text-red-500">*</span>
                          </label>
                          <KatalogSearch
                            items={katalogList}
                            value={item.name || item.code_id || ""}
                            disabled={isLoadingKatalog}
                            loading={isLoadingKatalog}
                            onSelect={(selected) => {
                              if ("custom" in selected && selected.custom) {
                                setNewDetails((prev) =>
                                  prev.map((d, i) =>
                                    i === idx
                                      ? {
                                          ...d,
                                          code_id: "",
                                          name: selected.name,
                                          unit: "",
                                          price: 0,
                                        }
                                      : d,
                                  ),
                                );
                              } else {
                                const kat = selected as ModalKatalogItem;
                                setNewDetails((prev) =>
                                  prev.map((d, i) =>
                                    i === idx
                                      ? {
                                          ...d,
                                          code_id: String(kat.id || kat.kode),
                                          name: kat.nama,
                                          unit: kat.satuan,
                                          price: Number(kat.harga_acuan),
                                        }
                                      : d,
                                  ),
                                );
                              }
                            }}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-foreground block mb-1">
                            Jumlah (Qty) <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            required
                            min="1"
                            step="any"
                            value={item.qty || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setNewDetails((prev) =>
                                prev.map((d, i) => (i === idx ? { ...d, qty: val } : d)),
                              );
                            }}
                            className="h-8.5 text-xs font-bold"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-foreground block mb-1">
                            Satuan <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            required
                            placeholder="Rim / Pcs"
                            value={item.unit === "-" ? "" : item.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewDetails((prev) =>
                                prev.map((d, i) => (i === idx ? { ...d, unit: val } : d)),
                              );
                            }}
                            className="h-8.5 text-xs font-semibold"
                          />
                        </div>

                        {(() => {
                          const kat = katalogList.find(
                            (k) =>
                              (item.code_id &&
                                (k.id === item.code_id || k.kode === item.code_id)) ||
                              (item.name && k.nama.toLowerCase() === item.name.toLowerCase()),
                          );
                          const showCatalogRef =
                            kat &&
                            kat.harga_acuan !== undefined &&
                            Number(item.price) !== Number(kat.harga_acuan);

                          return (
                            <div className="sm:col-span-3">
                              <label className="text-[10px] font-bold text-foreground block mb-1">
                                Harga Satuan (Rp) <span className="text-red-500">*</span>
                              </label>
                              <Input
                                type="number"
                                required
                                min="1"
                                step="any"
                                placeholder="0"
                                value={item.price || ""}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setNewDetails((prev) =>
                                    prev.map((d, i) => (i === idx ? { ...d, price: val } : d)),
                                  );
                                }}
                                className="h-8.5 text-xs font-mono font-bold"
                              />
                              {showCatalogRef && (
                                <span className="text-[10px] text-muted-foreground block mt-0.5 truncate">
                                  Acuan katalog: {money(Number(kat.harga_acuan))}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex justify-between items-center pt-1.5 text-[11px] border-t border-slate-100 dark:border-slate-800">
                        <span className="text-muted-foreground">Subtotal Item:</span>
                        <span className="font-extrabold text-foreground">
                          {money((item.price || 0) * (item.qty || 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-blue-100/70 p-2.5 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Total Estimasi Biaya Pengadaan:
                  </span>
                  <span className="text-sm font-black text-blue-900 dark:text-blue-100">
                    {money(currentTotal)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* JIKA ALUR A: CASCADING DROPDOWNS KURIKULUM & RESEP */
            <>
              <input type="hidden" name="groupCount" value={groupCount} />
              <CurriculumCascadingSelect
                curriculum={curriculum}
                selectedProdi={selectedProdi}
                setSelectedProdi={setSelectedProdi}
                selectedSemester={selectedSemester}
                setSelectedSemester={setSelectedSemester}
                selectedCourse={selectedCourse}
                setSelectedCourse={setSelectedCourse}
                selectedMenu={selectedMenu}
                setSelectedMenu={setSelectedMenu}
                groupCount={groupCount}
                setGroupCount={setGroupCount}
                labStockInventory={labStockInventory}
                onSelectMenuRecipe={onSelectMenuRecipe}
              />

              {/* Form Metadata Pengajuan Alur A */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-foreground">
                  Tanggal Kebutuhan Praktikum (Need-By Date)
                  <Input
                    type="date"
                    name="deadline"
                    required
                    min={localDateInput(0)}
                    defaultValue={localDateInput(7)}
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

              {/* Dynamic Items Editor Khusus Alur A */}
              <RequestDetailsEditor
                newDetails={newDetails}
                setNewDetails={setNewDetails}
                curriculum={curriculum}
                labStockInventory={labStockInventory}
                workflow={workflow}
              />
            </>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
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
                disabled={hasUnselectedAlurBItem}
                className={`gap-2 text-white font-bold w-full sm:w-auto cursor-pointer ${
                  workflow === "B"
                    ? "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    : "bg-primary hover:bg-blue-900"
                }`}
                title={
                  workflow === "B"
                    ? "Ajukan ke Koordinator Unit Kerja"
                    : "Ajukan ke Koordinator Lab"
                }
              >
                <Send className="size-4" />{" "}
                {workflow === "B"
                  ? "Ajukan ke Koordinator Unit Kerja"
                  : "Ajukan ke Koordinator Lab"}
              </Button>
            </div>
            {hasUnselectedAlurBItem && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 text-right">
                Lengkapi nama barang, jumlah, satuan, dan harga di setiap baris sebelum mengajukan.
              </p>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
