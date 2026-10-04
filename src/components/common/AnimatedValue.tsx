import React, { useEffect, useRef, useState } from "react";

interface AnimatedValueProps {
  value: string | number;
  className?: string;
  showIndicator?: boolean;
  startDelay?: number;
}

interface ParsedNumberString {
  prefix: string;
  targetNum: number;
  decimals: number;
  hasThousandSep: boolean;
  hasLeadingZero: boolean;
  padLength: number;
  suffix: string;
  isCurrency: boolean;
}

export function parseFormattedString(raw: string | number): ParsedNumberString | null {
  const str = String(raw).trim();
  const isCurrency = str.startsWith("Rp") || str.includes("Rp");

  // Regex to decompose string into prefix, number segment, and suffix:
  // e.g. "8.5 kg" -> prefix="", num="8.5", suffix=" kg"
  // e.g. "Sangat (94%)" -> prefix="Sangat (", num="94", suffix="%)"
  // e.g. "88%" -> prefix="", num="88", suffix="%"
  // e.g. "Rp 45.000.000" -> prefix="Rp ", num="45.000.000", suffix=""
  // e.g. "14 Item" -> prefix="", num="14", suffix=" Item"
  const regex = /^(.*?)((?:-|\+)?\d+(?:[.,]\d+)*(?:\.\d+)?)(.*)$/;
  const match = str.match(regex);

  if (!match) return null;

  const prefix = match[1];
  const numStr = match[2];
  const suffix = match[3];

  const hasLeadingZero = /^0\d+/.test(numStr);
  const padLength = numStr.length;

  let cleanNumStr = numStr;
  let hasThousandSep = false;
  let decimals = 0;

  if (cleanNumStr.includes(".") && !cleanNumStr.includes(",")) {
    if (/^\d{1,3}(\.\d{3})+$/.test(cleanNumStr)) {
      cleanNumStr = cleanNumStr.replace(/\./g, "");
      hasThousandSep = true;
    } else {
      const parts = cleanNumStr.split(".");
      decimals = parts[1] ? parts[1].length : 0;
    }
  } else if (cleanNumStr.includes(",") && !cleanNumStr.includes(".")) {
    const parts = cleanNumStr.split(",");
    if (parts[1] && parts[1].length !== 3) {
      decimals = parts[1].length;
      cleanNumStr = parts[0] + "." + parts[1];
    } else {
      hasThousandSep = true;
      cleanNumStr = cleanNumStr.replace(/,/g, "");
    }
  } else if (cleanNumStr.includes(".") && cleanNumStr.includes(",")) {
    hasThousandSep = true;
    cleanNumStr = cleanNumStr.replace(/\./g, "").replace(",", ".");
    const parts = cleanNumStr.split(".");
    decimals = parts[1] ? parts[1].length : 0;
  }

  const targetNum = parseFloat(cleanNumStr);
  if (isNaN(targetNum)) return null;

  return {
    prefix,
    targetNum,
    decimals,
    hasThousandSep: hasThousandSep || isCurrency,
    hasLeadingZero,
    padLength,
    suffix,
    isCurrency,
  };
}

export function formatNumberString(current: number, parsed: ParsedNumberString): string {
  let formattedNumber: string;

  if (parsed.hasThousandSep) {
    const rounded = Math.round(current);
    formattedNumber = rounded.toLocaleString("id-ID");
  } else if (parsed.decimals > 0) {
    formattedNumber = current.toFixed(parsed.decimals);
  } else if (parsed.hasLeadingZero) {
    const rounded = Math.round(current);
    formattedNumber = String(rounded).padStart(parsed.padLength, "0");
  } else {
    formattedNumber = String(Math.round(current));
  }

  let p = parsed.prefix;
  if (parsed.isCurrency) {
    p = p.replace(/Rp\s?/g, "");
  }

  return `${p}${formattedNumber}${parsed.suffix}`.trim();
}

/**
 * AnimatedValue Component
 * Displays numbers, currency, kg, and percentages with a smooth count-up animation that
 * starts right after the parent card/container finishes its entrance transition.
 */
export function AnimatedValue({
  value,
  className = "",
  showIndicator = true,
  startDelay,
}: AnimatedValueProps) {
  const str = String(value).trim();
  const parsed = parseFormattedString(str);

  // Initial state: starts from 0 formatted so user visually sees count-up as cards land
  const [displayNumber, setDisplayNumber] = useState<string>(() => {
    if (!parsed) return str;
    if (parsed.isCurrency) return "0";
    return formatNumberString(0, parsed);
  });

  const [isChanging, setIsChanging] = useState<boolean>(false);
  const [direction, setDirection] = useState<"up" | "down" | "neutral">("neutral");

  const hasMountedAnimationRef = useRef<boolean>(false);
  const prevTargetRef = useRef<number>(0);

  useEffect(() => {
    if (!parsed) {
      setDisplayNumber(str);
      return;
    }

    const isFirstRun = !hasMountedAnimationRef.current;
    const startNum = isFirstRun ? 0 : prevTargetRef.current;
    const nextTarget = parsed.targetNum;

    if (!isFirstRun) {
      if (nextTarget > startNum) setDirection("up");
      else if (nextTarget < startNum) setDirection("down");
      else setDirection("neutral");
    }

    // Wait for the card/container entrance to finish first!
    const delay = isFirstRun ? (startDelay ?? 420) : 0;

    let timeoutId: ReturnType<typeof setTimeout>;
    let animationFrameId: number;

    timeoutId = setTimeout(() => {
      hasMountedAnimationRef.current = true;
      prevTargetRef.current = nextTarget;
      setIsChanging(true);

      const duration = 1200; // 1.2s smooth count-up
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        const current = startNum + (nextTarget - startNum) * ease;

        setDisplayNumber(formatNumberString(current, parsed));

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          // Snap exact to target string
          if (parsed.isCurrency) {
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
  }, [value, startDelay]);

  const isCurrency = parsed?.isCurrency ?? (str.startsWith("Rp") || str.includes("Rp"));

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
