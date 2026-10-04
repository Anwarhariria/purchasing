import React, { useState, useEffect } from "react";
import { Calendar, ChevronDown, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PeriodFilterValues {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
}

interface FilterPeriodeProps {
  startMonth?: string;
  startYear?: string;
  endMonth?: string;
  endYear?: string;
  availableYears?: string[];
  onApply: (filter: PeriodFilterValues) => void;
  onReset: () => void;
  className?: string;
}

export const MONTH_NAMES: { value: string; label: string }[] = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export const FilterPeriode: React.FC<FilterPeriodeProps> = ({
  startMonth = "1",
  startYear = "2026",
  endMonth = "12",
  endYear = "2026",
  availableYears = ["2027", "2026", "2025", "2024"],
  onApply,
  onReset,
  className = "",
}) => {
  const [draftStartMonth, setDraftStartMonth] = useState(startMonth);
  const [draftStartYear, setDraftStartYear] = useState(startYear);
  const [draftEndMonth, setDraftEndMonth] = useState(endMonth);
  const [draftEndYear, setDraftEndYear] = useState(endYear);

  useEffect(() => {
    setDraftStartMonth(startMonth);
    setDraftStartYear(startYear);
    setDraftEndMonth(endMonth);
    setDraftEndYear(endYear);
  }, [startMonth, startYear, endMonth, endYear]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({
      startMonth: draftStartMonth,
      startYear: draftStartYear,
      endMonth: draftEndMonth,
      endYear: draftEndYear,
    });
  };

  const handleReset = () => {
    setDraftStartMonth("1");
    setDraftStartYear("2026");
    setDraftEndMonth("12");
    setDraftEndYear("2026");
    onReset();
  };

  const isFiltered =
    draftStartMonth !== "1" ||
    draftStartYear !== "2026" ||
    draftEndMonth !== "12" ||
    draftEndYear !== "2026";

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-card/70 p-1.5 sm:p-2 shadow-xs text-xs ${className}`}
    >
      <div className="flex items-center gap-1.5 px-1.5 text-xs font-bold text-muted-foreground shrink-0">
        <Calendar className="size-3.5 text-primary" />
        <span className="hidden sm:inline">Rentang Periode:</span>
        <span className="sm:hidden">Periode:</span>
      </div>

      {/* Periode Awal: Bulan & Tahun */}
      <div className="flex items-center gap-1">
        <div className="relative">
          <select
            name="start_month"
            value={draftStartMonth}
            onChange={(e) => setDraftStartMonth(e.target.value)}
            aria-label="Bulan Awal"
            className="h-8.5 rounded-lg border border-input bg-card pl-2.5 pr-7 text-xs font-semibold text-foreground shadow-xs hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none transition-colors"
          >
            {MONTH_NAMES.map((m) => (
              <option key={`start-m-${m.value}`} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        </div>

        <div className="relative">
          <select
            name="start_year"
            value={draftStartYear}
            onChange={(e) => setDraftStartYear(e.target.value)}
            aria-label="Tahun Awal"
            className="h-8.5 rounded-lg border border-input bg-card pl-2.5 pr-7 text-xs font-semibold text-foreground shadow-xs hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none transition-colors"
          >
            {availableYears.map((yr) => (
              <option key={`start-y-${yr}`} value={yr}>
                {yr}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        </div>
      </div>

      {/* Teks Pemisah: s/d */}
      <span className="px-1 text-xs font-bold text-muted-foreground shrink-0">s/d</span>

      {/* Periode Akhir: Bulan & Tahun */}
      <div className="flex items-center gap-1">
        <div className="relative">
          <select
            name="end_month"
            value={draftEndMonth}
            onChange={(e) => setDraftEndMonth(e.target.value)}
            aria-label="Bulan Akhir"
            className="h-8.5 rounded-lg border border-input bg-card pl-2.5 pr-7 text-xs font-semibold text-foreground shadow-xs hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none transition-colors"
          >
            {MONTH_NAMES.map((m) => (
              <option key={`end-m-${m.value}`} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        </div>

        <div className="relative">
          <select
            name="end_year"
            value={draftEndYear}
            onChange={(e) => setDraftEndYear(e.target.value)}
            aria-label="Tahun Akhir"
            className="h-8.5 rounded-lg border border-input bg-card pl-2.5 pr-7 text-xs font-semibold text-foreground shadow-xs hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none transition-colors"
          >
            {availableYears.map((yr) => (
              <option key={`end-y-${yr}`} value={yr}>
                {yr}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        </div>
      </div>

      {/* Tombol Aksi: Terapkan dan Reset */}
      <div className="flex items-center gap-1.5 ml-auto">
        <Button
          type="submit"
          size="sm"
          className="h-8.5 px-3 text-xs font-bold bg-primary hover:bg-blue-700 text-white cursor-pointer gap-1 shadow-xs"
        >
          <Check className="size-3" />
          <span>Terapkan</span>
        </Button>

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8.5 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer gap-1"
            title="Reset ke rentang Januari - Desember 2026"
          >
            <RotateCcw className="size-3" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>
    </form>
  );
};
