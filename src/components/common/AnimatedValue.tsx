import React, { useEffect, useRef, useState } from "react";

interface AnimatedValueProps {
  value: string;
  className?: string;
  showIndicator?: boolean;
}

/**
 * AnimatedValue Component
 * Displays numbers, currency, and percentages with a smooth, elegant count-up/down animation.
 * Tulisan "Rp" diletakkan di bawah angka, dan warna angka selalu berwarna biru solid (tidak berubah-ubah).
 */
export function AnimatedValue({
  value,
  className = "",
  showIndicator = true,
}: AnimatedValueProps) {
  const str = String(value).trim();
  const isCurrency = str.startsWith("Rp") || str.includes("Rp");
  const isPercent = str.endsWith("%");
  const hasLeadingZero = /^0\d+/.test(str);

  const [displayNumber, setDisplayNumber] = useState<string>(() => {
    if (isCurrency) {
      return str.replace(/Rp\s?/g, "").trim() || "0";
    }
    return str;
  });
  const [isChanging, setIsChanging] = useState<boolean>(false);
  const [direction, setDirection] = useState<"up" | "down" | "neutral">("neutral");
  const prevNumRef = useRef<number | null>(null);
  const isInitialMount = useRef<boolean>(true);

  useEffect(() => {
    // Extract digits for parsing
    let cleanStr = str.replace(/Rp\s?/g, "").replace(/%/g, "").trim();

    // Thousand separators in ID format
    if (cleanStr.includes(".") && !cleanStr.includes(",")) {
      if (/^\d{1,3}(\.\d{3})+$/.test(cleanStr)) {
        cleanStr = cleanStr.replace(/\./g, "");
      }
    } else if (cleanStr.includes(".") && cleanStr.includes(",")) {
      cleanStr = cleanStr.replace(/\./g, "").replace(",", ".");
    }

    const targetNum = parseFloat(cleanStr.replace(/[^0-9.-]/g, ""));

    if (isNaN(targetNum)) {
      setDisplayNumber(isCurrency ? str.replace(/Rp\s?/g, "").trim() : str);
      return;
    }

    const startNum = prevNumRef.current !== null ? prevNumRef.current : 0;
    prevNumRef.current = targetNum;

    if (!isInitialMount.current) {
      if (targetNum > startNum) {
        setDirection("up");
      } else if (targetNum < startNum) {
        setDirection("down");
      } else {
        setDirection("neutral");
      }
    } else {
      isInitialMount.current = false;
      setDirection("neutral");
    }

    setIsChanging(true);

    // Animasi lebih halus & tidak terburu-buru (1600ms)
    const duration = 1600;
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth ease-out quart (mulai lembut, melambat anggun)
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = startNum + (targetNum - startNum) * ease;

      let formattedDigits: string;
      if (isCurrency) {
        const rounded = Math.round(current);
        formattedDigits = rounded.toLocaleString("id-ID");
      } else if (isPercent) {
        formattedDigits = current.toFixed(1) + "%";
      } else if (hasLeadingZero) {
        const rounded = Math.round(current);
        formattedDigits = String(rounded).padStart(str.length, "0");
      } else {
        const suffix = str.replace(/^[0-9.,\s]+/, "");
        const prefix = str.match(/^[^\d]*/)?.[0] || "";
        const rounded = Math.round(current);
        formattedDigits = prefix + (suffix ? rounded + " " + suffix.trim() : String(rounded));
      }

      setDisplayNumber(formattedDigits);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Snap ke target tepat
        if (isCurrency) {
          setDisplayNumber(str.replace(/Rp\s?/g, "").trim());
        } else {
          setDisplayNumber(str);
        }
        const timer = setTimeout(() => {
          setIsChanging(false);
          setDirection("neutral");
        }, 600);
        return () => clearTimeout(timer);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, isCurrency, isPercent, hasLeadingZero, str]);

  return (
    <div className={`inline-flex items-baseline gap-1.5 whitespace-nowrap leading-none ${className}`}>
      {/* Tulisan Rp sejajar di depan angka pada baseline yang sama */}
      {isCurrency && (
        <span className="text-base sm:text-lg font-extrabold text-blue-600 dark:text-blue-400 select-none tracking-tight">
          Rp
        </span>
      )}

      {/* Angka nominal selalu berwarna BIRU solid, sejajar satu baris dengan Rp */}
      <span className="text-2xl sm:text-[27px] font-black tracking-tight text-blue-600 dark:text-blue-400 select-none">
        {displayNumber}
      </span>

      {/* Indikator perubahan nilai halus dan selaras warna biru */}
      {showIndicator && isChanging && direction !== "neutral" && (
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold transition-opacity duration-500 bg-blue-100/80 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 self-center"
          title={direction === "up" ? "Nilai Meningkat" : "Nilai Menurun"}
        >
          {direction === "up" ? "▲" : "▼"}
        </span>
      )}
    </div>
  );
}
