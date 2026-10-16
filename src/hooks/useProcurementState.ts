import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Role,
  Status,
  UserAccount,
  RequestItem,
  RequestDetail,
  NotificationItem,
  StudyProgramData,
  LabStockItem,
  SemesterData,
  CourseData,
  MenuItemRecipe,
  RecipeIngredient,
} from "@/types/procurement";
import { SpakeApi } from "@/lib/api-client";
import { calculateRequestTotals } from "@/lib/utils";
import { toast } from "sonner";

interface RawCurriculumItem {
  id?: string | number;
  prodi?: string;
  prodiName?: string;
  semester?: number | string;
  semesters?: SemesterData[];
  course?: string;
  menu_name?: string;
  menuName?: string;
  ingredients?: RecipeIngredient[];
}

export function transformCurriculumData(raw: unknown): StudyProgramData[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const items = raw as RawCurriculumItem[];

  // If already nested { prodiName, semesters }
  if (items[0]?.prodiName && Array.isArray(items[0]?.semesters)) {
    return items as unknown as StudyProgramData[];
  }

  // Transform flat list { id, prodi, semester, course, menu_name, ingredients }
  const prodiMap = new Map<string, Map<number, Map<string, MenuItemRecipe[]>>>();

  for (const item of items) {
    const prodi = String(item.prodi || "D3 Perhotelan");
    const sem = Number(item.semester) || 1;
    const course = String(item.course || "Praktikum");
    const menu: MenuItemRecipe = {
      id: String(item.id || "M-1"),
      menuName: String(item.menu_name || item.menuName || "Menu Praktik"),
      ingredients: item.ingredients || [],
    };

    if (!prodiMap.has(prodi)) prodiMap.set(prodi, new Map());
    const semMap = prodiMap.get(prodi)!;
    if (!semMap.has(sem)) semMap.set(sem, new Map());
    const courseMap = semMap.get(sem)!;
    if (!courseMap.has(course)) courseMap.set(course, []);
    courseMap.get(course)!.push(menu);
  }

  const result: StudyProgramData[] = [];
  for (const [prodiName, semMap] of prodiMap.entries()) {
    const semesters: SemesterData[] = [];
    for (const [semester, courseMap] of semMap.entries()) {
      const courses: CourseData[] = [];
      for (const [courseName, menus] of courseMap.entries()) {
        courses.push({ courseName, menus });
      }
      semesters.push({ semester, courses });
    }
    result.push({ prodiName, semesters });
  }

  return result;
}

export function useProcurementState(notify: (msg: string) => void, isLoggedIn: boolean = false) {
  const queryClient = useQueryClient();
  const canFetch = isLoggedIn && SpakeApi.hasToken();

  // 1. Data Requests via TanStack Query (enabled: canFetch, polling 10s)
  const { data: remoteRequests, refetch: refetchRequests } = useQuery({
    queryKey: ["procurement-requests"],
    queryFn: async () => {
      try {
        const res = await SpakeApi.getRequests();
        return res.data || [];
      } catch (_err: unknown) {
        return [];
      }
    },
    enabled: canFetch,
    refetchInterval: canFetch ? 10000 : false,
  });

  const [requests, setRequests] = useState<RequestItem[]>([]);
  useEffect(() => {
    if (remoteRequests) {
      setRequests(remoteRequests);
    }
  }, [remoteRequests]);

  // 2. Data Notifikasi via TanStack Query (enabled: canFetch, polling 10s)
  const { data: remoteNotifs, refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        const res = await SpakeApi.getNotifications();
        return res.data || [];
      } catch {
        return [];
      }
    },
    enabled: canFetch,
    refetchInterval: canFetch ? 10000 : false,
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  useEffect(() => {
    if (remoteNotifs) {
      setNotifications(remoteNotifs);
    }
  }, [remoteNotifs]);

  // 3. Data Kurikulum / Resep via TanStack Query (enabled: canFetch)
  const { data: remoteCurriculum } = useQuery({
    queryKey: ["curriculums"],
    queryFn: async () => {
      try {
        const res = await SpakeApi.getCurriculums();
        return res.data || [];
      } catch {
        return [];
      }
    },
    enabled: canFetch,
  });

  const [curriculum, setCurriculum] = useState<StudyProgramData[]>([]);
  useEffect(() => {
    if (remoteCurriculum) {
      setCurriculum(transformCurriculumData(remoteCurriculum));
    }
  }, [remoteCurriculum]);

  // 4. Data Stok Lab / Chiller via TanStack Query (enabled: canFetch)
  const { data: remoteStocks } = useQuery({
    queryKey: ["stocks-map"],
    queryFn: async () => {
      try {
        const res = await SpakeApi.getStockMap();
        return res.data || {};
      } catch {
        return {};
      }
    },
    enabled: canFetch,
  });

  const [labStock, setLabStock] = useState<Record<string, LabStockItem>>({});
  useEffect(() => {
    if (remoteStocks) {
      setLabStock(remoteStocks);
    }
  }, [remoteStocks]);

  // 5. Data User Management (hanya dimuat untuk Super Admin sesuai aturan)
  const isSuperAdmin =
    typeof window !== "undefined" && localStorage.getItem("spake_role") === "Super Admin";
  const { data: remoteUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const res = await SpakeApi.getUsers();
        return res.data || [];
      } catch {
        return [];
      }
    },
    enabled: canFetch && isSuperAdmin,
    retry: false,
  });

  const [users, setUsers] = useState<UserAccount[]>([]);
  useEffect(() => {
    if (remoteUsers) {
      setUsers(remoteUsers);
    }
  }, [remoteUsers]);

  // Reset queries & state when logged out
  useEffect(() => {
    if (!canFetch) {
      setRequests([]);
      setNotifications([]);
      setCurriculum([]);
      setLabStock({});
      setUsers([]);
      queryClient.clear();
    }
  }, [canFetch, queryClient]);

  function addNotification(
    targetRole: Role | "Semua",
    title: string,
    desc: string,
    requestId?: string,
  ) {
    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title,
      desc,
      time: "Baru saja",
      targetRole,
      requestId,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }

  // Aksi perubahan status dan alur pengadaan
  async function updateStatus(
    id: string,
    newStatus: Status,
    note?: string,
    extraData?: Partial<RequestItem> & { formData?: FormData },
  ) {
    try {
      const finalExtra = extraData || {};

      if (finalExtra.faktorF !== undefined) {
        if (finalExtra.formData instanceof FormData) {
          await SpakeApi.keputusanKeuangan(id, finalExtra.formData);
        } else {
          const transferAmt = finalExtra.nominalTransfer ?? finalExtra.danaDiterima;
          await SpakeApi.keputusanKeuangan(id, {
            faktor_f: finalExtra.faktorF,
            catatan_keuangan: note || "",
            ...(transferAmt !== undefined ? { nominal_transfer: transferAmt } : {}),
          });
        }
      } else if (newStatus === "LAPORAN_BELANJA_DIAJUKAN" && finalExtra.actualSpent !== undefined) {
        if (finalExtra.formData instanceof FormData) {
          await SpakeApi.submitSpj(id, finalExtra.formData);
        } else {
          await SpakeApi.submitSpj(id, {
            actualSpent: finalExtra.actualSpent,
            receiptImages: finalExtra.receiptImages || [],
            note,
          });
        }
      } else {
        await SpakeApi.updateStatus(id, newStatus, note, finalExtra);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["procurement-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["stocks-map"] }),
      ]);

      notify(`Status pengajuan ${id} berhasil diubah ke ${newStatus}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Gagal mengubah status pengajuan ${id}.`;
      toast.error(msg);
      notify(msg);
      throw err;
    }
  }

  async function handleSaveQtyChanges(
    reqId: string,
    updatedDetails: RequestDetail[],
    currentRole: Role,
  ) {
    try {
      const { totalPrice: updatedPrice, totalQty: updatedTotalQty } =
        calculateRequestTotals(updatedDetails);
      await SpakeApi.updateRequest(reqId, {
        details: updatedDetails,
        price: updatedPrice,
        qty: updatedTotalQty,
        note: `Qty disesuaikan oleh ${currentRole}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["procurement-requests"] });
      notify(`Jumlah Qty bahan untuk ${reqId} berhasil diperbarui.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Gagal memperbarui Qty.`;
      toast.error(msg);
      notify(msg);
    }
  }

  function handleQuickAdjustStock(name: string, delta: number, label: string) {
    setLabStock((prev) => {
      const current = prev[name];
      if (!current) return prev;
      const newStock = Math.max(0, Number((current.stock + delta).toFixed(2)));
      return {
        ...prev,
        [name]: { ...current, stock: newStock },
      };
    });
    notify(`Stok "${name}" diperbarui: ${delta > 0 ? `+${delta}` : delta} (${label}).`);
  }

  return {
    requests,
    setRequests,
    users,
    setUsers,
    curriculum,
    setCurriculum,
    labStock,
    setLabStock,
    notifications,
    setNotifications,
    addNotification,
    updateStatus,
    handleSaveQtyChanges,
    handleQuickAdjustStock,
    refetchRequests,
    refetchNotifications,
  };
}
