import React, { useState, useEffect } from "react";
import { Calendar, ChevronDown, RotateCcw, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/utils";

export interface PeriodFilterValues {
  mode: "date" | "month";
  startDate?: string | undefined; // "YYYY-MM-DD"
  endDate?: string | undefined; // "YYYY-MM-DD"
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
}

export interface PeriodFilterProps {
  mode?: ("date" | "month") | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  startMonth?: string | undefined;
  startYear?: string | undefined;
  endMonth?: string | undefined;
  endYear?: string | undefined;
  availableYears?: string[] | undefined;
  onApply: (filter: PeriodFilterValues) => void;
  onReset: () => void;
  className?: string | undefined;
}

export const PeriodFilter: React.FC<PeriodFilterProps> = ({
  mode = "month",
  startDate = "2026-10-16",
  endDate = "2026-11-16",
  startMonth = "1",
  startYear = "2026",
  endMonth = "12",
  endYear = "2026",
  availableYears = ["2027", "2026", "2025", "2024"],
  onApply,
  onReset,
  className = "",
}) => {
  const [filterMode, setFilterMode] = useState<"date" | "month">(mode);
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftEndDate, setDraftEndDate] = useState(endDate);
  const [draftStartMonth, setDraftStartMonth] = useState(startMonth);
  const [draftStartYear, setDraftStartYear] = useState(startYear);
  const [draftEndMonth, setDraftEndMonth] = useState(endMonth);
  const [draftEndYear, setDraftEndYear] = useState(endYear);

  useEffect(() => {
    setFilterMode(mode);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setDraftStartMonth(startMonth);
    setDraftStartYear(startYear);
    setDraftEndMonth(endMonth);
    setDraftEndYear(endYear);
  }, [mode, startDate, endDate, startMonth, startYear, endMonth, endYear]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({
      mode: filterMode,
      startDate: draftStartDate,
      endDate: draftEndDate,
      startMonth: draftStartMonth,
      startYear: draftStartYear,
      endMonth: draftEndMonth,
      endYear: draftEndYear,
    });
  };

  const handleReset = () => {
    setFilterMode("month");
    setDraftStartDate("2026-10-16");
    setDraftEndDate("2026-11-16");
    setDraftStartMonth("1");
    setDraftStartYear("2026");
    setDraftEndMonth("12");
    setDraftEndYear("2026");
    onReset();
  };

  const isFiltered =
    filterMode === "date" ||
    draftStartMonth !== "1" ||
    draftStartYear !== "2026" ||
    draftEndMonth !== "12" ||
    draftEndYear !== "2026";

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-border bg-slate-50 dark:bg-card/70 p-1.5 sm:p-2 shadow-xs text-xs ${className}`}
    >
      {/* Mode Switcher: Tanggal Spesifik vs Pilihan Bulan */}
      <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
        <button
          type="button"
          onClick={() => setFilterMode("date")}
          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
            filterMode === "date"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Filter berdasarkan tanggal spesifik (hari-bulan-tahun)"
        >
          <Calendar className="size-3" />
          <span>Tanggal</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("month")}
          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
            filterMode === "month"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Filter berdasarkan bulan & tahun"
        >
          <Clock className="size-3" />
          <span>Bulan</span>
        </button>
      </div>

      {filterMode === "date" ? (
        /* Rentang Tanggal Spesifik (Input Type Date) */
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Dari:</span>
            <input
              type="date"
              value={draftStartDate}
              onChange={(e) => setDraftStartDate(e.target.value)}
              className="h-8.5 rounded-lg border border-input bg-card px-2 text-xs font-semibold text-foreground shadow-xs hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            />
          </div>

          <span className="text-xs font-bold text-muted-foreground">s/d</span>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Sampai:</span>
            <input
              type="date"
              value={draftEndDate}
              onChange={(e) => setDraftEndDate(e.target.value)}
              className="h-8.5 rounded-lg border border-input bg-card px-2 text-xs font-semibold text-foreground shadow-xs hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            />
          </div>
        </div>
      ) : (
        /* Rentang Bulan & Tahun */
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Periode Awal */}
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

          <span className="px-0.5 text-xs font-bold text-muted-foreground">s/d</span>

          {/* Periode Akhir */}
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
        </div>
      )}

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
