import { FifoPriorityView, type FifoPriorityViewProps } from "./FifoPriorityView";
import type { Role, Status } from "@/types/procurement";
import type { FifoRankedItem } from "@/lib/algorithms/fifo";
import { calculateFIFO } from "@/lib/algorithms/fifo";

export { FifoPriorityView };
export type { FifoPriorityViewProps };

export interface SawPriorityViewProps {
  sawRankings?: any[];
  fifoRankings?: FifoRankedItem[];
  role: Role;
  exportCsv: () => void;
  setQuickReviewId: (id: string) => void;
  updateStatus: (id: string, newStatus: Status) => void;
  setSelectedId: (id: string) => void;
}

export function SawPriorityView({
  sawRankings,
  fifoRankings,
  role,
  exportCsv,
  setQuickReviewId,
  updateStatus,
  setSelectedId,
}: SawPriorityViewProps) {
  // Selalu tampilkan data antrean FIFO (First-In First-Out)
  const items: FifoRankedItem[] =
    fifoRankings ||
    (sawRankings && sawRankings.length > 0 ? calculateFIFO(sawRankings) : []);

  return (
    <FifoPriorityView
      fifoRankings={items}
      role={role}
      exportCsv={exportCsv}
      setQuickReviewId={setQuickReviewId}
      updateStatus={updateStatus}
      setSelectedId={setSelectedId}
    />
  );
}
