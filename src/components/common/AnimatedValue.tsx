import React, { useEffect, useRef, useState } from "react";

interface AnimatedValueProps {
  value: string | number;
  className?: string;
  showIndicator?: boolean;
  startDelay?: number;
}

function parseTargetNum(rawStr: string): number {
  let cleanStr = rawStr.replace(/Rp\s?/g, "").replace(/%/g, "").trim();
  if (cleanStr.includes(".") && !cleanStr.includes(",")) {
    if (/^\d{1,3}(\.\d{3})+$/.test(cleanStr)) {
      cleanStr = cleanStr.replace(/\./g, "");
    }
  } else if (cleanStr.includes(".") && cleanStr.includes(",")) {
    cleanStr = cleanStr.replace(/\./g, "").replace(",", ".");
  }
  return parseFloat(cleanStr.replace(/[^0-9.-]/g, ""));
}

function formatNumber(
  current: number,
  rawStr: string,
  isCurrency: boolean,
  isPercent: boolean,
  hasLeadingZero: boolean
): string {
  if (isCurrency) {
    const rounded = Math.round(current);
    return rounded.toLocaleString("id-ID");
  } else if (isPercent) {
    return current.toFixed(1) + "%";
  } else if (hasLeadingZero) {
    const rounded = Math.round(current);
    return String(rounded).padStart(rawStr.length, "0");
  } else {
    // Extract suffix like "Item", "PR", "Hidangan"
    const match = rawStr.match(/^\s*[\d.,]+\s*(.*)$/);
    const suffix = match && match[1] ? match[1].trim() : "";
    const prefix = rawStr.match(/^[^\d]*/)?.[0] || "";
    const rounded = Math.round(current);
    return prefix + (suffix ? `${rounded} ${suffix}` : String(rounded));
  }
}

/**
 * AnimatedValue Component
 * Displays numbers, currency, and percentages with a smooth count-up animation that
 * starts right after the parent card/container finishes its entrance transition.
 */
export function AnimatedValue({
  value,
  className = "",
  showIndicator = true,
  startDelay,
}: AnimatedValueProps) {
  const str = String(value).trim();
  const isCurrency = str.startsWith("Rp") || str.includes("Rp");
  const isPercent = str.endsWith("%");
  const hasLeadingZero = /^0\d+/.test(str);

  const initialTarget = parseTargetNum(str);

  // Initial state starts at 0 so the user clearly sees numbers count up after container arrives
  const [displayNumber, setDisplayNumber] = useState<string>(() => {
    if (isNaN(initialTarget)) {
      return isCurrency ? str.replace(/Rp\s?/g, "").trim() || "0" : str;
    }
    return formatNumber(0, str, isCurrency, isPercent, hasLeadingZero);
  });

  const [isChanging, setIsChanging] = useState<boolean>(false);
  const [direction, setDirection] = useState<"up" | "down" | "neutral">("neutral");
  const prevNumRef = useRef<number | null>(null);

  useEffect(() => {
    const nextTarget = parseTargetNum(str);
    if (isNaN(nextTarget)) {
      setDisplayNumber(isCurrency ? str.replace(/Rp\s?/g, "").trim() : str);
      return;
    }

    const isFirstMount = prevNumRef.current === null;
    const startNum = isFirstMount ? 0 : prevNumRef.current;
    prevNumRef.current = nextTarget;

    if (!isFirstMount) {
      if (nextTarget > startNum) {
        setDirection("up");
      } else if (nextTarget < startNum) {
        setDirection("down");
      } else {
        setDirection("neutral");
      }
    } else {
      setDirection("neutral");
    }

    // If first mount and nextTarget is 0, keep at 0 without unnecessary loop
    if (isFirstMount && nextTarget === 0) {
      setDisplayNumber(formatNumber(0, str, isCurrency, isPercent, hasLeadingZero));
      return;
    }

    // Wait for the card/container entrance to finish first!
    // Default initial delay is 420ms (cards finish slide-up at ~450ms)
    const delay = isFirstMount ? (startDelay ?? 420) : 0;

    let timeoutId: ReturnType<typeof setTimeout>;
    let animationFrameId: number;

    timeoutId = setTimeout(() => {
      setIsChanging(true);
      const duration = 1200; // Smooth 1.2s count-up duration
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Quartic ease-out: starts with swift natural motion, decelerates smoothly
        const ease = 1 - Math.pow(1 - progress, 4);
        const current = startNum + (nextTarget - startNum) * ease;

        setDisplayNumber(formatNumber(current, str, isCurrency, isPercent, hasLeadingZero));

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          // Snap precisely to target at end
          if (isCurrency) {
            setDisplayNumber(str.replace(/Rp\s?/g, "").trim());
          } else {
            setDisplayNumber(str);
          }
          const t = setTimeout(() => {
            setIsChanging(false);
            setDirection("neutral");
          }, 350);
          return () => clearTimeout(t);
        }
      };

      animationFrameId = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, isCurrency, isPercent, hasLeadingZero, str, startDelay]);

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
