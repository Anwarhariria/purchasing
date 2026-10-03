export function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5 shadow-xs border border-border/80 ${
        compact ? "h-10 w-10" : "h-11 w-11"
      }`}
    >
      <img
        src="/logo-asaindo.png"
        alt="Logo Universitas Asa Indonesia"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
