import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, CheckCircle2, Sparkles, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, calculateRequestTotals } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { SpakeApi } from "@/lib/api-client";
import type { ProdiCurriculum, RequestDetail, LabStockItem } from "@/types/procurement";

interface ItemAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: {
    name: string;
    unit?: string | undefined;
    price?: number | undefined;
    extra?: string | undefined;
  }) => void;
  options: {
    name: string;
    extra?: string | undefined;
    unit?: string | undefined;
    price?: number | undefined;
  }[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}

function ItemAutocompleteInput({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  className = "",
  required = false,
}: ItemAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) return options.slice(0, 10);
    return options.filter((opt) => opt.name.toLowerCase().includes(q)).slice(0, 15);
  }, [options, value]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          required={required}
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full rounded-md border border-input bg-card px-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all ${
            value ? "pr-6" : ""
          } ${className}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(true);
            }}
            className="absolute inset-y-0 right-0 pr-2 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
            title="Hapus"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] max-w-sm rounded-lg border border-border bg-card p-1 shadow-xl max-h-52 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 flex justify-between">
            <span>Rekomendasi Bahan ({filtered.length})</span>
            <span>Klik untuk memilih</span>
          </div>
          <div className="divide-y divide-border/20 mt-0.5">
            {filtered.map((opt) => {
              const isSelected = value.toLowerCase().trim() === opt.name.toLowerCase().trim();
              return (
                <button
                  key={opt.name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold truncate">{opt.name}</p>
                    {opt.extra && (
                      <p className="text-[10px] text-muted-foreground truncate">{opt.extra}</p>
                    )}
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-foreground/80 font-medium shrink-0">
                    Pilih
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface RequestDetailsEditorProps {
  newDetails: RequestDetail[];
  setNewDetails: React.Dispatch<React.SetStateAction<RequestDetail[]>>;
  curriculum: ProdiCurriculum[];
  labStockInventory: Record<string, LabStockItem>;
  workflow?: "A" | "B";
}

export const RequestDetailsEditor: React.FC<RequestDetailsEditorProps> = ({
  newDetails,
  setNewDetails,
  curriculum,
  labStockInventory,
  workflow = "A",
}) => {
  const isAlurB = workflow === "B";

  interface KatalogItemRow {
    id?: string | number;
    kode?: string;
    nama: string;
    satuan: string;
    harga_acuan: number;
    aktif?: boolean;
  }

  // Data katalog barang untuk Alur B dari database
  const { data: katalogRes } = useQuery({
    queryKey: ["katalog-barang"],
    queryFn: () => SpakeApi.getKatalogBarang(),
    enabled: isAlurB,
  });
  const katalogBarang = useMemo(
    () => (katalogRes?.data as unknown as KatalogItemRow[]) || [],
    [katalogRes],
  );

  // Master Bahan Kitchen untuk Autocomplete (Alur A)
  const masterIngredientOptions = useMemo(() => {
    if (isAlurB) return [];
    const map = new Map<
      string,
      {
        name: string;
        extra?: string | undefined;
        unit?: string | undefined;
        price?: number | undefined;
      }
    >();

    // 1. Dari stok inventaris laboratorium
    if (labStockInventory) {
      Object.entries(labStockInventory).forEach(([name, item]) => {
        const key = name.toLowerCase().trim();
        const existing = map.get(key);
        map.set(key, {
          name,
          extra: `Stok Lab: ${item.stock} ${item.unit}`,
          unit: existing?.unit || item.unit,
          price: existing?.price ?? 0,
        });
      });
    }

    // 2. Dari seluruh resep kurikulum masakan
    if (curriculum) {
      curriculum.forEach((p) => {
        p.semesters?.forEach((s) => {
          s.courses?.forEach((c) => {
            c.menus?.forEach((m) => {
              m.ingredients?.forEach((ing) => {
                const key = ing.name.toLowerCase().trim();
                if (!map.has(key)) {
                  const ingWithPrice = ing as { pricePerUnit?: number; price?: number };
                  const unitPrice = ingWithPrice.pricePerUnit ?? ingWithPrice.price ?? 0;
                  map.set(key, {
                    name: ing.name,
                    extra: unitPrice > 0 ? `${ing.unit} · ${money(unitPrice)}` : ing.unit,
                    unit: ing.unit,
                    price: unitPrice,
                  });
                }
              });
            });
          });
        });
      });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [labStockInventory, curriculum, isAlurB]);

  // Master Katalog Barang Umum (Alur B)
  const masterLogisticsOptions = useMemo(() => {
    if (!isAlurB || !katalogBarang.length) return [];
    return katalogBarang
      .filter((item: KatalogItemRow) => item.aktif)
      .map((item: KatalogItemRow) => ({
        name: item.nama,
        extra: `${item.satuan} · ${money(item.harga_acuan)}`,
        unit: item.satuan,
        price: item.harga_acuan,
      }));
  }, [isAlurB, katalogBarang]);

  // Handler memilih bahan dari autocomplete popover (auto-fill satuan & harga)
  const handleSelectItem = (
    index: number,
    opt: { name: string; unit?: string | undefined; price?: number | undefined },
  ) => {
    setNewDetails((prev) =>
      prev.map((detail, idx) => {
        if (idx !== index) return detail;
        const labItem = labStockInventory ? labStockInventory[opt.name] : undefined;

        let unit = opt.unit || detail.unit;
        const price = opt.price ?? detail.price;

        if (labItem && (!unit || unit === "kg/liter")) {
          unit = labItem.unit;
        }

        return {
          ...detail,
          name: opt.name,
          unit: unit || "kg",
          price: price || 0,
        };
      }),
    );
  };

  // Handler update ketikan nama bahan/barang manual
  const handleDetailNameChange = (index: number, value: string) => {
    setNewDetails((prev) =>
      prev.map((detail, idx) => {
        if (idx !== index) return detail;
        const normalized = value.toLowerCase().trim();

        if (isAlurB) {
          const matchedCatalog = katalogBarang.find(
            (c: KatalogItemRow) => c.nama.toLowerCase().trim() === normalized,
          );
          if (matchedCatalog) {
            return {
              ...detail,
              name: matchedCatalog.nama,
              unit: matchedCatalog.satuan,
              price: matchedCatalog.harga_acuan,
            };
          }
          return { ...detail, name: value };
        }

        const matchedOption = masterIngredientOptions.find(
          (opt) => opt.name.toLowerCase().trim() === normalized,
        );
        let unit = detail.unit;
        let price = detail.price;

        if (matchedOption) {
          if (!unit || unit === "kg/liter") {
            unit = matchedOption.unit || unit;
          }
          if (!price || price === 0) {
            price = matchedOption.price ?? price;
          }
        } else if (labStockInventory && labStockInventory[value]) {
          if (!unit || unit === "kg/liter") {
            unit = labStockInventory[value].unit;
          }
        }

        return { ...detail, name: value, unit, price };
      }),
    );
  };

  const updateDetailField = <K extends keyof RequestDetail>(
    index: number,
    field: K,
    val: RequestDetail[K],
  ) => {
    setNewDetails((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: val } : item)),
    );
  };

  const { totalPrice } = calculateRequestTotals(newDetails);

  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              {isAlurB ? "Rincian Barang yang Dipesan" : "Rincian Bahan yang Harus Dibeli"}
            </h4>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 self-start sm:self-auto shrink-0 font-bold cursor-pointer"
          onClick={() =>
            setNewDetails([
              ...newDetails,
              {
                id: "D-" + Date.now(),
                name: "",
                qty: 1,
                unit: isAlurB ? "pcs" : "kg",
                price: 0,
              },
            ])
          }
        >
          <Plus className="size-3" /> {isAlurB ? "Tambah Barang" : "Tambah Bahan"}
        </Button>
      </div>

      {newDetails.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          <p className="font-bold flex items-center justify-center gap-1.5 text-foreground">
            {isAlurB ? (
              <Package className="size-4 text-blue-500" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-600" />
            )}
            {isAlurB
              ? "Belum ada barang dalam daftar pengajuan."
              : "Semua bahan untuk menu ini sudah tersedia lengkap di stok laboratorium!"}
          </p>
          <p className="mt-1 text-[11px]">
            Klik tombol <strong>{isAlurB ? "+ Tambah Barang" : "+ Tambah Bahan"}</strong> di atas
            untuk menambahkan item pesanan.
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
                    {isAlurB ? `Barang #${index + 1}` : `Bahan #${index + 1}`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                    onClick={() => {
                      setNewDetails(newDetails.filter((_, i) => i !== index));
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-foreground block mb-1">
                    {isAlurB ? "Nama Pesanan / Barang" : "Nama Barang / Bahan"}
                  </label>
                  <ItemAutocompleteInput
                    required
                    className="h-8 text-xs font-semibold"
                    placeholder={
                      isAlurB
                        ? "Ketik nama barang (contoh: Kertas HVS, Spidol)..."
                        : "Ketik nama bahan (contoh: Telur, Tepung)..."
                    }
                    value={detail.name}
                    onChange={(val) => handleDetailNameChange(index, val)}
                    onSelect={(opt) => handleSelectItem(index, opt)}
                    options={isAlurB ? masterLogisticsOptions : masterIngredientOptions}
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
                      onChange={(e) => updateDetailField(index, "qty", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                      Satuan
                    </label>
                    <Input
                      required
                      className="h-8 text-xs"
                      placeholder={isAlurB ? "rim/pcs/box" : "kg/liter"}
                      value={detail.unit}
                      onChange={(e) => updateDetailField(index, "unit", e.target.value)}
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
                      onChange={(e) => updateDetailField(index, "price", Number(e.target.value))}
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
          <div className="hidden sm:block overflow-visible rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      {isAlurB ? "Nama Pesanan / Barang" : "Nama Barang / Bahan"}
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
                      <ItemAutocompleteInput
                        required
                        className="h-8 text-xs font-medium"
                        placeholder={
                          isAlurB
                            ? "Ketik nama barang (contoh: Kertas HVS A4, Spidol)..."
                            : "Ketik nama bahan (contoh: Telur, Tepung)..."
                        }
                        value={detail.name}
                        onChange={(val) => handleDetailNameChange(index, val)}
                        onSelect={(opt) => handleSelectItem(index, opt)}
                        options={isAlurB ? masterLogisticsOptions : masterIngredientOptions}
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
                        onChange={(e) => updateDetailField(index, "qty", Number(e.target.value))}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        required
                        className="h-8 text-xs"
                        placeholder={isAlurB ? "rim/pcs/box" : "kg/liter"}
                        value={detail.unit}
                        onChange={(e) => updateDetailField(index, "unit", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        required
                        min="0"
                        step="500"
                        className="h-8 text-xs font-mono"
                        value={detail.price || ""}
                        onChange={(e) => updateDetailField(index, "price", Number(e.target.value))}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        onClick={() => {
                          setNewDetails(newDetails.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Ringkasan Biaya Belanja */}
          <div className="mt-3 flex items-center justify-between rounded-lg bg-surface p-3 border border-border">
            <span className="text-xs font-semibold text-muted-foreground">
              Total Estimasi Belanja ({newDetails.length} barang):
            </span>
            <span className="text-sm font-black text-foreground">{money(totalPrice)}</span>
          </div>
        </>
      )}
    </div>
  );
};
