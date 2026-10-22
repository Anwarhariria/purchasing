import React, { useState, useEffect, useRef, useMemo, useId } from "react";
import { Search, X, PackagePlus } from "lucide-react";
import { money } from "@/lib/utils";

export interface ModalKatalogItem {
  id: string | number;
  kode?: string;
  nama: string;
  satuan: string;
  harga_acuan: number | string;
}

export type KatalogSelectResult = ModalKatalogItem | { custom: true; name: string };

export interface KatalogSearchProps {
  items: ModalKatalogItem[];
  value?: string;
  onSelect: (item: KatalogSelectResult) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

/**
 * Highlight substring pencarian dalam teks secara case-insensitive.
 */
function highlightMatch(text: string, search: string): React.ReactNode {
  const trimmed = search.trim();
  if (!trimmed) return text;
  try {
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    if (parts.length <= 1) return text;
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === trimmed.toLowerCase() ? (
            <mark
              key={i}
              className="bg-amber-200/90 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100 rounded-xs px-0.5 font-bold"
            >
              {part}
            </mark>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          ),
        )}
      </>
    );
  } catch {
    return text;
  }
}

export const KatalogSearch: React.FC<KatalogSearchProps> = ({
  items,
  value = "",
  onSelect,
  disabled = false,
  loading = false,
  placeholder = "Cari barang (nama atau kode)…",
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Sinkronkan teks tampilan jika prop value berubah dari luar
  useEffect(() => {
    if (value) {
      const match = items.find(
        (k) =>
          String(k.id) === String(value) ||
          k.kode === value ||
          k.nama === value ||
          k.nama.toLowerCase() === value.toLowerCase(),
      );
      setQuery(match ? match.nama : value);
    } else {
      setQuery("");
    }
  }, [value, items]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmed = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!trimmed) return items.slice(0, 8);
    return items
      .filter((item) => {
        const idStr = String(item.id || "").toLowerCase();
        const codeStr = String(item.kode || "").toLowerCase();
        const nameStr = String(item.nama || "").toLowerCase();
        return idStr.includes(trimmed) || codeStr.includes(trimmed) || nameStr.includes(trimmed);
      })
      .slice(0, 8);
  }, [items, trimmed]);

  // Tampilkan opsi custom barang bila ada query yang diketik
  // dan bukan persis sama dengan nama salah satu hasil katalog yang terpilih
  const showCustomOption =
    trimmed.length > 0 &&
    (filteredItems.length === 0 || !filteredItems.some((k) => k.nama.toLowerCase() === trimmed));

  const totalOptions = filteredItems.length + (showCustomOption ? 1 : 0);

  const handleSelectItem = (item: ModalKatalogItem) => {
    setQuery(item.nama);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect(item);
  };

  const handleSelectCustom = (customName: string) => {
    setQuery(customName);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect({ custom: true, name: customName });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect({ custom: true, name: "" });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(totalOptions - 1);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
      }
    } else if (e.key === "Enter") {
      if (isOpen && totalOptions > 0) {
        e.preventDefault();
        const targetIndex = highlightedIndex >= 0 ? highlightedIndex : 0;
        const targetItem = filteredItems[targetIndex];
        if (targetItem) {
          handleSelectItem(targetItem);
        } else if (showCustomOption) {
          handleSelectCustom(query.trim());
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="relative flex items-center"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
      >
        <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          title={query || undefined}
          disabled={disabled}
          placeholder={loading ? "Memuat katalog…" : placeholder}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="h-8.5 w-full rounded-md border border-input bg-card pl-8 pr-7 py-1 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed placeholder:font-normal placeholder:text-muted-foreground"
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded"
            title="Kosongkan pilihan"
            aria-label="Kosongkan pilihan"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 top-full mt-1 w-full sm:min-w-[24rem] max-w-[calc(100vw-2rem)] max-h-64 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-xl text-xs py-1"
        >
          {loading && (
            <li className="px-3 py-2 text-muted-foreground text-center italic">
              Memuat data katalog…
            </li>
          )}

          {!loading && filteredItems.length === 0 && !showCustomOption && (
            <li className="px-3 py-2 text-muted-foreground text-center italic">
              Tidak ada barang yang cocok.
            </li>
          )}

          {!loading &&
            filteredItems.map((item, idx) => {
              const isSelected = highlightedIndex === idx;
              const displayCode = item.kode || item.id;
              return (
                <li
                  key={item.id || item.kode}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelectItem(item)}
                  className={`px-3 py-2 cursor-pointer transition-colors border-b border-border/40 last:border-b-0 ${
                    isSelected
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "hover:bg-accent/50"
                  }`}
                >
                  {/* Baris 1: Nama barang (wrap, jangan truncate, highlight query yang cocok) */}
                  <div className="text-xs font-semibold text-foreground leading-snug break-words">
                    {highlightMatch(item.nama, query)}
                  </div>

                  {/* Baris 2: [kode] · satuan · harga acuan */}
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground font-normal">
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      [{highlightMatch(String(displayCode), query)}]
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>{item.satuan}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {money(Number(item.harga_acuan))}
                    </span>
                  </div>
                </li>
              );
            })}

          {!loading && showCustomOption && (
            <li
              role="option"
              aria-selected={highlightedIndex === filteredItems.length}
              onMouseEnter={() => setHighlightedIndex(filteredItems.length)}
              onClick={() => handleSelectCustom(query.trim())}
              className={`px-3 py-2.5 cursor-pointer text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-2 border-t border-dashed border-border ${
                highlightedIndex === filteredItems.length
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                  : "hover:bg-blue-50/60 dark:hover:bg-blue-950/20"
              }`}
            >
              <PackagePlus className="size-4 shrink-0" />
              <span className="break-words">
                + Gunakan &ldquo;{query.trim()}&rdquo; sebagai barang di luar katalog
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
