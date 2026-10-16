import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, type FormEvent } from "react";
import { toast as sonnerToast } from "sonner";
import { SpakeApi } from "@/lib/api-client";
import { CheckCircle2 } from "lucide-react";

// Data & Types
import {
  type Role,
  type Status,
  type RequestItem,
  type RequestDetail,
  type ProcurementActivityLog,
  isPemohon,
  isKoordinator,
  isKeuangan,
} from "@/types/procurement";

// Algorithms & Utilities
import {
  calculateStockDeficit,
  calculateRequestTotals,
  matchesCoordinatorUnit,
  parseRequestDate,
} from "@/lib/utils";
import { exportExcel, exportPdf, exportSingleExcel, exportSinglePdf } from "@/lib/export-utils";
import { getSidebarNav } from "@/config/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useProcurementState } from "@/hooks/useProcurementState";
import { useMasterCrud } from "@/hooks/useMasterCrud";

// Views & Pages
import { LoginPage } from "@/components/auth/LoginPage";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RoleKpiCards, type RoleMetrics } from "@/components/dashboard/RoleKpiCards";
import { UserManagementView } from "@/components/dashboard/UserManagementView";
import { CurriculumMasterView } from "@/components/dashboard/CurriculumMasterView";
import { RecipeMenuView } from "@/components/dashboard/RecipeMenuView";
import { InventoryStockView } from "@/components/dashboard/InventoryStockView";
import { MonthlyReportView } from "@/components/dashboard/MonthlyReportView";
import { RequestsTableView } from "@/components/dashboard/RequestsTableView";
import { BukuKasbonView } from "@/components/dashboard/BukuKasbonView";
import { AdminModelForecastingView } from "@/components/dashboard/forecasting/AdminModelForecastingView";
import { AlurBForecastingView } from "@/components/dashboard/forecasting/AlurBForecastingView";
import type { WorkflowType } from "@/types/procurement";

// Modals
import { CreateRequestModal } from "@/components/modals/CreateRequestModal";
import { RequestDetailModal } from "@/components/modals/RequestDetailModal";
import { QuickTransferModal } from "@/components/modals/QuickTransferModal";
import { ReportExpenseModal } from "@/components/modals/ReportExpenseModal";
import { MasterModalsContainer } from "@/components/modals/MasterModalsContainer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SPAKE | Sistem Pengadaan Kampus ASAINDO" },
      {
        name: "description",
        content:
          "Dasbor pengadaan internal Universitas Asa Indonesia untuk pengajuan, pemeriksaan stok, dan alokasi dana.",
      },
      { property: "og:title", content: "SPAKE | Sistem Pengadaan Kampus ASAINDO" },
      {
        property: "og:description",
        content: "Kelola pengajuan barang kampus dalam satu alur yang jelas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

export type { Role, Status };

function Dashboard() {
  const [toast, setToast] = useState("");
  function notify(msg: string) {
    setToast(msg);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setToast(""), 4000);
    }
  }

  const [section, setSection] = useState<string>("Ringkasan");
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowType>("A");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    currentView,
    setCurrentView,
    currentUser,
    setCurrentUser,
    role,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginError,
    handleGoToLogin,
    handleBackToLanding,
    handleLogin,
    handleQuickLogin,
    handleLogout,
    handleRoleChange,
  } = useAuthSession([], notify, (s) => {
    setSection(s);
    setStatusFilter("Semua Status");
    setMobileOpen(false);
  });

  const isLoggedIn = !!currentUser && !!role;

  const {
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
  } = useProcurementState(notify, isLoggedIn);

  // Auto-switch dashboard workflow to match logged in user role/department
  useEffect(() => {
    if (currentUser) {
      const deptLower = (currentUser.department || "").toLowerCase();
      const emailLower = (currentUser.email || "").toLowerCase();

      const r = currentUser.role;
      if (
        r === "Asdos Kitchen" ||
        r === "Koordinator Lab" ||
        r === "Kaprodi" ||
        r === "Keuangan Kitchen"
      ) {
        setActiveWorkflow("A");
      } else if (r === "Staf Unit" || r === "Koordinator Unit" || r === "Keuangan Umum") {
        setActiveWorkflow("B");
      }
    }
  }, [currentUser]);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [waActionData, setWaActionData] = useState<{
    action: "approve" | "reject";
    id: string;
  } | null>(null);
  const [quickReviewId, setQuickReviewId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const [newDetails, setNewDetails] = useState<RequestDetail[]>([
    { id: "D-tmp-1", name: "", qty: 1, unit: "", price: 0 },
  ]);

  // Handler Tautan Respons Cepat WhatsApp (Klik Terima / Tolak dari WA)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const reqId = params.get("id");
    const targetRole = params.get("role");

    if (reqId && (action === "approve" || action === "reject")) {
      setCurrentView("dashboard");
      if (targetRole === "Kaprodi" || !targetRole) {
        handleRoleChange("Kaprodi");
        const kaprodiUser = users.find((u) => u.role === "Kaprodi");
        if (kaprodiUser) {
          setCurrentUser(kaprodiUser);
          try {
            localStorage.setItem("spake_user", JSON.stringify(kaprodiUser));
          } catch {
            // intentional ignore storage write error
          }
        }
      }
      setSelectedId(reqId);
      setWaActionData({ action: action as "approve" | "reject", id: reqId });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [users]);

  // State Cascading Dropdown Pengajuan
  const [selectedProdi, setSelectedProdi] = useState<string>(
    curriculum[0]?.prodiName || "D3 Perhotelan",
  );
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedCourse, setSelectedCourse] = useState<string>(
    curriculum[0]?.semesters[0]?.courses[0]?.courseName || "",
  );
  const [selectedMenu, setSelectedMenu] = useState<string>(
    curriculum[0]?.semesters[0]?.courses[0]?.menus[0]?.menuName || "",
  );
  const [groupCount, setGroupCount] = useState<number>(1);

  // Master Data CRUD Hook
  const crud = useMasterCrud({
    curriculum,
    setCurriculum,
    users,
    setUsers,
    currentUser,
    setCurrentUser,
    labStock,
    setLabStock,
    selectedProdi,
    setSelectedProdi,
    notify,
  });

  // State Modal Pelaporan Belanja Asdos (Bon & Selisih Uang)
  const [reportingRequestId, setReportingRequestId] = useState<string | null>(null);
  const [reportSpentAmount, setReportSpentAmount] = useState<number>(0);
  const [reportReceiptImg, setReportReceiptImg] = useState<string | null>(null);
  const [reportReceiptFile, setReportReceiptFile] = useState<File | null>(null);

  // State Edit Qty Bahan oleh Koordinator / Kaprodi di Modal Detail
  const [editableDetails, setEditableDetails] = useState<RequestDetail[]>([]);

  const activeRequest = requests.find((r) => r.id === selectedId) || null;
  const quickReviewItem = requests.find((r) => r.id === quickReviewId) || null;

  useEffect(() => {
    if (activeRequest && activeRequest.details) {
      setEditableDetails(JSON.parse(JSON.stringify(activeRequest.details)));
    } else {
      setEditableDetails([]);
    }
  }, [activeRequest]);

  function handleReportExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reportingRequestId) return;
    const targetItem = requests.find((r) => r.id === reportingRequestId);
    if (!targetItem) return;

    if (
      !reportReceiptFile &&
      !reportReceiptImg &&
      (!targetItem.receiptImages || targetItem.receiptImages.length === 0)
    ) {
      sonnerToast.error(
        "Wajib melampirkan foto bon / nota belanja fisik! Tanpa foto bon, laporan tidak dapat diproses.",
      );
      notify(
        "Wajib melampirkan foto bon / nota belanja fisik! Tanpa foto bon, laporan tidak dapat diproses.",
      );
      return;
    }

    const danaDiterima = targetItem.danaDiterima || targetItem.nominalTransfer || targetItem.price;
    const spent = reportSpentAmount;
    let refund = 0;
    let deficit = 0;

    if (danaDiterima > spent) {
      refund = danaDiterima - spent;
    } else if (spent > danaDiterima) {
      deficit = spent - danaDiterima;
    }

    const formData = new FormData();
    formData.append("actualSpent", String(spent));
    formData.append("note", "Laporan belanja & bon diserahkan oleh Asdos.");
    if (reportReceiptFile) {
      formData.append("receipts[]", reportReceiptFile);
    }

    updateStatus(
      reportingRequestId,
      "LAPORAN_BELANJA_DIAJUKAN",
      "Laporan belanja & bon diserahkan oleh Asdos.",
      {
        actualSpent: spent,
        refundAmount: refund,
        deficitAmount: deficit,
        formData,
      },
    );

    setReportingRequestId(null);
    setReportSpentAmount(0);
    setReportReceiptImg(null);
    setReportReceiptFile(null);
    sonnerToast.success("Laporan belanja dan bukti bon berhasil dikirim.");
    notify(`Laporan belanja untuk ${reportingRequestId} dan bukti bon berhasil dikirim.`);
  }

  async function handleCreateRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const deadline = String(data.get("deadline") || "");
    const academicImportance = (data.get("academicImportance") ||
      "Standar") as RequestItem["academicImportance"];
    const purpose = String(data.get("purpose") || "");

    const groupCountVal = Number(data.get("groupCount")) || groupCount || 1;
    const isAlurB = activeWorkflow === "B";
    const item = isAlurB
      ? newDetails[0]?.name
        ? `${newDetails[0].name}${newDetails.length > 1 ? ` (+${newDetails.length - 1} item lainnya)` : ""}`
        : purpose || "Pengadaan Barang & ATK Unit"
      : groupCountVal > 1
        ? `${selectedMenu} (${groupCountVal} Kelompok)`
        : selectedMenu;
    const { totalPrice, totalQty } = calculateRequestTotals(newDetails);

    if (!item || !deadline || newDetails.length === 0 || totalPrice === 0) {
      notify("Data tidak lengkap. Pastikan rincian barang belanja telah terisi.");
      return;
    }

    if (!isAlurB) {
      // Validasi Tanggal Kebutuhan Praktik: Minimal H-3 hari dari hari ini (hanya Alur A)
      const minAllowedTime = new Date();
      minAllowedTime.setHours(0, 0, 0, 0);
      minAllowedTime.setDate(minAllowedTime.getDate() + 3);

      const chosenDate = new Date(deadline);
      chosenDate.setHours(0, 0, 0, 0);

      if (isNaN(chosenDate.getTime()) || chosenDate.getTime() < minAllowedTime.getTime()) {
        notify(
          "Peringatan SOP: Tanggal kebutuhan praktikum (need-by date) minimal H-3 hari dari hari ini.",
        );
        return;
      }
    }

    const userUnit =
      currentUser?.department ||
      (isAlurB ? "Penerimaan Mahasiswa Baru" : "Laboratorium Terpadu Kitchen");
    const applicantName = currentUser
      ? currentUser.name
      : isAlurB
        ? "Dewi Sartika (Staf Unit)"
        : "Aura Maharani (Asdos)";

    const newReq: RequestItem = {
      id: "", // Dihasilkan otomatis oleh backend
      alur: activeWorkflow,
      item,
      category: isAlurB ? "Logistik & ATK Unit" : "Bahan Praktik Masak",
      prodi: isAlurB ? undefined : selectedProdi,
      unitKerja: isAlurB ? userUnit : undefined,
      semester: isAlurB ? undefined : selectedSemester,
      course: isAlurB ? undefined : selectedCourse,
      menu: isAlurB ? undefined : selectedMenu,
      groupCount: isAlurB ? undefined : groupCountVal,
      applicant: applicantName,
      department: userUnit,
      academicImportance: isAlurB ? "Standar" : academicImportance,
      needBy: deadline,
      deadline,
      price: totalPrice,
      status: "DIAJUKAN",
      qty: totalQty,
      unit: isAlurB ? "items" : "kg/unit",
      details: [...newDetails],
      date: new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date()),
      purpose:
        purpose ||
        (isAlurB
          ? `Kebutuhan operasional ATK & logistik ${userUnit}`
          : `Praktik memasak mata kuliah ${selectedCourse} (${groupCountVal} Kelompok)`),
    };

    try {
      const res = await SpakeApi.createRequest(newReq);
      const serverId = res?.data?.id || "Pengadaan Baru";
      setFormOpen(false);
      refetchRequests();
      refetchNotifications();
      sonnerToast.success(`Permohonan ${serverId} berhasil diajukan.`);
      notify(
        `Permohonan ${serverId} (${item}) berhasil diajukan ke Koordinator ${
          isAlurB ? "Unit Kerja" : "Lab Kitchen"
        }.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengajukan permohonan.";
      sonnerToast.error(msg);
      notify(msg);
    }
  }

  function onSelectMenuRecipe(
    menuName: string,
    customCourse?: string,
    customSem?: number,
    customProdi?: string,
    customCurriculum = curriculum,
    multiplier: number = groupCount,
  ) {
    setSelectedMenu(menuName);
    const pName = customProdi || selectedProdi;
    const sNum = customSem !== undefined ? customSem : selectedSemester;
    const cName = customCourse || selectedCourse;

    const currentProdiData = customCurriculum.find((p) => p.prodiName === pName);
    const currentSemData = currentProdiData?.semesters.find((s) => s.semester === sNum);
    const currentCourseData = currentSemData?.courses.find((c) => c.courseName === cName);
    let targetMenu = currentCourseData?.menus.find((m) => m.menuName === menuName);

    // Cari di seluruh kurikulum jika menu bukan berasal dari mata kuliah yang dipilih
    if (!targetMenu) {
      for (const p of customCurriculum) {
        for (const s of p.semesters) {
          for (const c of s.courses) {
            const found = c.menus.find((m) => m.menuName === menuName);
            if (found) {
              targetMenu = found;
              break;
            }
          }
          if (targetMenu) break;
        }
        if (targetMenu) break;
      }
    }

    if (targetMenu && targetMenu.ingredients.length > 0) {
      const mult = multiplier > 0 ? multiplier : 1;
      const generatedDetails: RequestDetail[] = targetMenu.ingredients
        .map((ing, idx) => {
          const totalNeeded = (ing.neededQty || 0) * mult;
          const labStockItem = labStock[ing.name]?.stock || 0;
          const deficitQty = calculateStockDeficit(totalNeeded, labStockItem);
          return {
            id: `D-${Date.now()}-${idx}`,
            name: ing.name,
            neededQty: totalNeeded,
            stockInLab: labStockItem,
            qty: deficitQty > 0 ? deficitQty : 0,
            unit: ing.unit,
            price: ing.pricePerUnit,
          };
        })
        .filter((d) => d.qty > 0);

      setNewDetails(generatedDetails);
    }
  }

  const workflowFilteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeWorkflow === "B") return r.alur === "B";
      return !r.alur || r.alur === "A";
    });
  }, [requests, activeWorkflow]);

  const sidebarNav = useMemo(() => {
    return getSidebarNav(
      role,
      {
        requestsCount: workflowFilteredRequests.length,
        stockCount: Object.keys(labStock).length,
        pendingReviewCount:
          isKoordinator(role) && activeWorkflow === "B" && currentUser?.department
            ? workflowFilteredRequests.filter(
                (r) => r.status === "DIAJUKAN" && matchesCoordinatorUnit(r, currentUser.department),
              ).length
            : workflowFilteredRequests.filter((r) => r.status === "DIAJUKAN").length,
        pendingKaprodiCount: workflowFilteredRequests.filter(
          (r) => r.status === "DIVERIFIKASI_KOORD",
        ).length,
        pendingFinanceCount: workflowFilteredRequests.filter(
          (r) =>
            r.status === "DISETUJUI_KAPRODI" ||
            (activeWorkflow === "B" && r.status === "DIVERIFIKASI_KOORD"),
        ).length,
        pendingLpjCount: workflowFilteredRequests.filter(
          (r) => r.status === "LAPORAN_BELANJA_DIAJUKAN",
        ).length,
        userCount: users.length,
        kasbonPendingCount: workflowFilteredRequests.filter(
          (r) => (r.refundAmount || 0) > 0 && !r.buktiSetorUrl,
        ).length,
      },
      activeWorkflow,
    );
  }, [role, workflowFilteredRequests, users, labStock, activeWorkflow, currentUser]);

  const visibleRequests = useMemo(() => {
    let list = workflowFilteredRequests;
    const isQueueSection =
      section === "Antrean Verifikasi" ||
      section === "Antrean Validasi" ||
      section === "Verifikasi Standar Bahan" ||
      section === "Verifikasi Pengajuan Unit" ||
      section === "Persetujuan Kurikulum";

    if (isPemohon(role)) {
      if (currentUser) {
        list = list.filter((r) => r.applicant === currentUser.name);
      }
    } else if (isKoordinator(role) && activeWorkflow === "B" && currentUser?.department) {
      list = list.filter((r) => matchesCoordinatorUnit(r, currentUser.department));
      if (
        section === "Antrean Verifikasi" ||
        section === "Verifikasi Standar Bahan" ||
        section === "Verifikasi Pengajuan Unit"
      ) {
        list = list.filter((r) => r.status === "DIAJUKAN");
      }
    } else if (
      isKoordinator(role) &&
      (section === "Antrean Verifikasi" ||
        section === "Verifikasi Standar Bahan" ||
        section === "Verifikasi Pengajuan Unit")
    ) {
      list = list.filter((r) => r.status === "DIAJUKAN");
    } else if (
      role === "Kaprodi" &&
      (section === "Antrean Validasi" || section === "Persetujuan Kurikulum")
    ) {
      list = list.filter((r) => r.status === "DIVERIFIKASI_KOORD");
    } else if (
      isKeuangan(role) &&
      (section === "Pencairan Dana" || section === "Alokasi & Penugasan Belanja")
    ) {
      list = list.filter(
        (r) =>
          r.status === "DISETUJUI_KAPRODI" ||
          (activeWorkflow === "B" && r.status === "DIVERIFIKASI_KOORD"),
      );
    } else if (
      isKeuangan(role) &&
      (section === "Verifikasi Laporan Belanja" || section === "Rekonsiliasi Bon & Serah Terima")
    ) {
      list = list.filter(
        (r) =>
          r.status === "LAPORAN_BELANJA_DIAJUKAN" ||
          (activeWorkflow === "B" &&
            (r.status === "SEDANG_DIBELANJAKAN" || r.status === "BARANG_DITERIMA")),
      );
    }

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.item.toLowerCase().includes(q) ||
          (r.menu && r.menu.toLowerCase().includes(q)) ||
          r.applicant.toLowerCase().includes(q) ||
          (r.course && r.course.toLowerCase().includes(q)) ||
          (r.unitKerja && r.unitKerja.toLowerCase().includes(q)),
      );
    }

    if (statusFilter !== "Semua Status") {
      list = list.filter((r) => r.status === statusFilter);
    }

    // Urutan antrean verifikasi: terlama di atas (oldest first) tanpa label/nomor prioritas
    if (isQueueSection) {
      list = [...list].sort((a, b) => {
        const timeA = parseRequestDate(a.date)?.timestamp || 0;
        const timeB = parseRequestDate(b.date)?.timestamp || 0;
        return timeA - timeB;
      });
    }

    return list;
  }, [workflowFilteredRequests, role, section, currentUser, query, statusFilter, activeWorkflow]);

  const roleMetrics: RoleMetrics = useMemo(() => {
    let list = workflowFilteredRequests;
    if (isPemohon(role) && currentUser) {
      list = list.filter((r) => r.applicant === currentUser.name);
    } else if (isKoordinator(role) && activeWorkflow === "B" && currentUser?.department) {
      list = list.filter((r) => matchesCoordinatorUnit(r, currentUser.department));
    }

    const pendingReviewTotal =
      isKoordinator(role) && activeWorkflow === "B" && currentUser?.department
        ? workflowFilteredRequests.filter(
            (r) => r.status === "DIAJUKAN" && matchesCoordinatorUnit(r, currentUser.department),
          ).length
        : workflowFilteredRequests.filter((r) => r.status === "DIAJUKAN").length;

    return {
      total: list.length,
      waiting: list.filter((r) => r.status === "DIAJUKAN").length,
      inProcess: list.filter((r) =>
        [
          "DIVERIFIKASI_KOORD",
          "DISETUJUI_KAPRODI",
          "DANA_DICAIRKAN",
          "SEDANG_DIBELANJAKAN",
          "BARANG_DITERIMA",
        ].includes(r.status),
      ).length,
      done: list.filter((r) => r.status === "SELESAI").length,
      needReview: pendingReviewTotal,
      needApprove: workflowFilteredRequests.filter((r) => r.status === "DIVERIFIKASI_KOORD").length,
      needTransfer: workflowFilteredRequests.filter(
        (r) =>
          r.status === "DISETUJUI_KAPRODI" ||
          (activeWorkflow === "B" && r.status === "DIVERIFIKASI_KOORD"),
      ).length,
      needLpjVerify: workflowFilteredRequests.filter((r) => r.status === "LAPORAN_BELANJA_DIAJUKAN")
        .length,
      totalEst: list.reduce((sum, r) => sum + r.price, 0),
      totalTransfer: list
        .filter((r) =>
          [
            "DANA_DICAIRKAN",
            "SEDANG_DIBELANJAKAN",
            "BARANG_DITERIMA",
            "LAPORAN_BELANJA_DIAJUKAN",
            "SELESAI",
          ].includes(r.status),
        )
        .reduce((sum, r) => sum + (r.danaDiterima || r.nominalTransfer || r.price), 0),
      usersCount: users.length,
      activeProc: list.filter((r) =>
        ["DANA_DICAIRKAN", "SEDANG_DIBELANJAKAN", "BARANG_DITERIMA"].includes(r.status),
      ).length,
    };
  }, [workflowFilteredRequests, role, currentUser, users.length, activeWorkflow]);

  // LOGIN PAGE (bila role null atau view === login, tampilkan halaman login)
  if (currentView === "login" || !role || !currentUser) {
    return (
      <LoginPage
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        onLogin={handleLogin}
        onQuickLogin={handleQuickLogin}
      />
    );
  }

  // AUTHENTICATED DASHBOARD VIEW
  return (
    <div className="flex min-h-screen bg-background font-sans antialiased text-foreground">
      {/* SIDEBAR */}
      <Sidebar
        sidebarNav={sidebarNav}
        section={section}
        setSection={setSection}
        role={role}
        currentUser={currentUser}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        activeWorkflow={activeWorkflow}
        exportExcel={() => exportExcel(requests)}
        exportPdf={() => exportPdf(requests)}
        notify={notify}
        onOpenCreateRequest={() => {
          if (activeWorkflow === "B") {
            setSelectedMenu("");
            setNewDetails([{ id: "D-" + Date.now(), name: "", qty: 1, unit: "rim", price: 0 }]);
          } else {
            setSelectedProdi(curriculum[0]?.prodiName || "D3 Perhotelan");
            setSelectedSemester(1);
            const firstCourse = curriculum[0]?.semesters[0]?.courses[0]?.courseName || "";
            setSelectedCourse(firstCourse);
            const firstMenu = curriculum[0]?.semesters[0]?.courses[0]?.menus[0]?.menuName || "";
            setSelectedMenu(firstMenu);
            setGroupCount(1);
            if (firstMenu) {
              onSelectMenuRecipe(
                firstMenu,
                firstCourse,
                1,
                curriculum[0]?.prodiName,
                curriculum,
                1,
              );
            } else {
              setNewDetails([]);
            }
          }
          setFormOpen(true);
        }}
        onOpenAddStock={() => {
          crud.setEditingStockItem(null);
          crud.setStockModalOpen(true);
        }}
        onOpenAddUser={() => {
          crud.setEditingUser(null);
          crud.setUserModalOpen(true);
        }}
        onOpenAddProdi={() => {
          crud.setNewProdiName("");
          crud.setProdiModalOpen(true);
        }}
        onOpenAddCourse={() => {
          crud.setEditingCourseName(null);
          crud.setCourseFormName("");
          crud.setCourseModalOpen(true);
        }}
        onOpenAddMenu={() => {
          const defaultCourse =
            crud.kaprodiSelectedCourse || curriculum[0]?.semesters[0]?.courses[0]?.courseName || "";
          crud.handleOpenAddMenu(defaultCourse);
        }}
        onQuickReviewFinance={() => {
          const item = requests.find(
            (r) =>
              r.status === "DISETUJUI_KAPRODI" ||
              (activeWorkflow === "B" && r.status === "DIVERIFIKASI_KOORD"),
          );
          if (item) {
            setQuickReviewId(item.id);
          } else {
            notify("Tidak ada pengajuan yang menunggu pencairan dana / alokasi belanja.");
          }
        }}
        onOpenQueue={() => {
          if (isKoordinator(role)) {
            setSection("Antrean Verifikasi");
          } else if (role === "Kaprodi") {
            setSection("Antrean Validasi");
          }
        }}
        onOpenVerify={() => {
          if (isKoordinator(role)) {
            setSection("Verifikasi Standar Bahan");
          } else if (role === "Kaprodi") {
            setSection("Persetujuan Kurikulum");
          } else if (isKeuangan(role)) {
            setSection("Pencairan Dana");
          }
        }}
      />

      {/* MAIN CONTENT AREA */}
      <div
        className={`flex flex-1 flex-col min-w-0 overflow-x-hidden transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[265px]"
        }`}
      >
        <DashboardHeader
          role={role}
          handleRoleChange={handleRoleChange}
          activeWorkflow={activeWorkflow}
          currentUser={currentUser}
          setMobileOpen={setMobileOpen}
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          unreadNotifCount={notifications.filter((n) => !n.read).length}
          visibleNotifications={notifications}
          setNotifications={setNotifications}
          setSelectedId={(id: string) => setSelectedId(id)}
          handleLogout={handleLogout}
          setCurrentView={setCurrentView}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* BANNER UCAPAN SELAMAT DATANG KEMBALI */}
          <div
            className={`mb-6 rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors ${
              activeWorkflow === "A"
                ? "border-rose-200/80 bg-gradient-to-r from-rose-50/90 via-amber-50/40 to-white dark:border-rose-900/40 dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900"
                : "border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white dark:border-blue-900/40 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900"
            }`}
          >
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Selamat Datang Kembali, {currentUser?.name || role}
            </h1>
          </div>

          {/* TOP KPI STATS SUMMARY */}
          <RoleKpiCards
            role={role}
            roleMetrics={roleMetrics}
            requests={requests}
            workflow={activeWorkflow}
          />

          {/* BUKU KASBON ASDOS (ALUR A) */}
          {(section === "Buku Kasbon Asdos" || section === "Kasbon Asdos") && (
            <BukuKasbonView
              requests={requests}
              role={role}
              currentUser={currentUser}
              notify={notify}
              onUpdateStatus={(id, s, note, extra) => updateStatus(id, s, note, extra)}
            />
          )}

          {/* DYNAMIC SECTION VIEWS */}

          {section === "Pengguna & Peran" && role === "Super Admin" && (
            <UserManagementView
              users={users}
              onAddUser={() => {
                crud.setEditingUser(null);
                crud.setUserModalOpen(true);
              }}
              onEditUser={(u) => {
                crud.setEditingUser(u);
                crud.setUserModalOpen(true);
              }}
              notify={notify}
            />
          )}

          {section === "Master Prodi & Matakuliah" && role === "Super Admin" && (
            <CurriculumMasterView
              curriculum={curriculum}
              adminSelectedProdi={crud.adminSelectedProdi}
              setAdminSelectedProdi={crud.setAdminSelectedProdi}
              adminSelectedSem={crud.adminSelectedSem}
              setAdminSelectedSem={crud.setAdminSelectedSem}
              onOpenAddProdi={() => {
                crud.setNewProdiName("");
                crud.setProdiModalOpen(true);
              }}
              onDeleteProdi={crud.handleDeleteProdi}
              onOpenAddCourse={(sem) => {
                crud.setAdminSelectedSem(sem);
                crud.setEditingCourseName(null);
                crud.setCourseFormName("");
                crud.setCourseModalOpen(true);
              }}
              onOpenEditCourse={(courseName) => {
                crud.setEditingCourseName(courseName);
                crud.setCourseFormName(courseName);
                crud.setCourseModalOpen(true);
              }}
              onDeleteCourse={crud.handleDeleteCourse}
            />
          )}

          {section === "Kelola Menu & Bahan" && role === "Kaprodi" && (
            <RecipeMenuView
              curriculum={curriculum}
              kaprodiSelectedProdi={crud.kaprodiSelectedProdi}
              setKaprodiSelectedProdi={crud.setKaprodiSelectedProdi}
              kaprodiSelectedSem={crud.kaprodiSelectedSem}
              setKaprodiSelectedSem={crud.setKaprodiSelectedSem}
              kaprodiSelectedCourse={crud.kaprodiSelectedCourse}
              setKaprodiSelectedCourse={crud.setKaprodiSelectedCourse}
              onOpenAddMenu={crud.handleOpenAddMenu}
              onOpenEditMenu={crud.handleOpenEditMenu}
              onDeleteMenu={crud.handleDeleteMenu}
            />
          )}

          {(section === "Inventaris Stok Lab" ||
            section === "Cek Stok Bahan Lab" ||
            section === "Stok Bahan Lab") &&
            (isPemohon(role) || isKoordinator(role)) && (
              <InventoryStockView
                labStock={labStock}
                onQuickAdjustStock={handleQuickAdjustStock}
                onEditStockItem={(item) => {
                  crud.setEditingStockItem({
                    name: item.name,
                    stock: item.stock,
                    unit: item.unit,
                    originalName: item.name,
                  });
                  crud.setStockModalOpen(true);
                }}
                onDeleteStock={crud.handleDeleteStock}
              />
            )}

          {(section.includes("Laporan") || section === "Report Bulanan") && (
            <MonthlyReportView
              section={section}
              requests={requests}
              setSelectedId={(id) => setSelectedId(id)}
              exportExcel={(items, options) => exportExcel(items || requests, options, notify)}
              exportPdf={(items, options) => exportPdf(items || requests, options)}
              exportSingleExcel={(r) => exportSingleExcel(r, notify)}
              exportSinglePdf={(r) => exportSinglePdf(r, notify)}
              role={role}
              currentUser={currentUser}
              workflow={activeWorkflow}
            />
          )}

          {/* HALAMAN MODEL PERAMALAN (SUPER ADMIN) */}
          {section === "Model Peramalan" && role === "Super Admin" && (
            <AdminModelForecastingView notify={notify} />
          )}

          {/* HALAMAN PERAMALAN ALUR B (KEUANGAN UMUM, KOORDINATOR UNIT, STAF UNIT) */}
          {(section === "Peramalan Kebutuhan Barang" ||
            section === "Peramalan Kebutuhan Unit" ||
            section === "Rekomendasi Kebutuhan") && (
            <AlurBForecastingView
              role={role}
              currentUser={currentUser}
              notify={notify}
              onOpenCreateRequest={(items) => {
                if (items && items.length > 0) {
                  setSelectedMenu("");
                  setNewDetails(
                    items.map((it, idx) => ({
                      id: it.id || "D-" + Date.now() + "-" + idx,
                      code_id: it.code_id || (it as { barang_id?: string }).barang_id || "",
                      name: it.name,
                      qty: it.qty,
                      unit: it.unit,
                      price: it.price,
                    })),
                  );
                }
                setFormOpen(true);
              }}
            />
          )}

          {/* MAIN DATA TABLE VIEW */}
          {(section === "Ringkasan" ||
            section === "Ringkasan Logistik" ||
            section === "Permohonan" ||
            section === "Pengajuan Unit Kerja" ||
            section === "Antrean Verifikasi" ||
            section === "Antrean Validasi" ||
            section === "Verifikasi Standar Bahan" ||
            section === "Verifikasi Pengajuan Unit" ||
            section === "Persetujuan Kurikulum" ||
            section === "Pencairan Dana" ||
            section === "Alokasi & Penugasan Belanja" ||
            section === "Verifikasi Laporan Belanja" ||
            section === "Rekonsiliasi Bon & Serah Terima" ||
            section === "Master Permohonan") && (
            <RequestsTableView
              role={role}
              section={section}
              visibleRequests={visibleRequests}
              requests={requests}
              workflow={activeWorkflow}
              query={query}
              setQuery={setQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              currentUser={currentUser}
              setSelectedId={(id) => setSelectedId(id)}
              setQuickReviewId={(id) => setQuickReviewId(id)}
              setReportingRequestId={(id) => setReportingRequestId(id)}
              setReportSpentAmount={setReportSpentAmount}
              updateStatus={(id, s, note) => updateStatus(id, s, note)}
            />
          )}

          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            SPAKE · Sistem Pengadaan Kampus Universitas Asa Indonesia
          </p>
        </main>
      </div>

      {/* ALL MODALS */}
      <CreateRequestModal
        open={formOpen}
        onOpenChange={setFormOpen}
        workflow={activeWorkflow}
        currentUser={currentUser}
        curriculum={curriculum}
        selectedProdi={selectedProdi}
        setSelectedProdi={setSelectedProdi}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        selectedCourse={selectedCourse}
        setSelectedCourse={setSelectedCourse}
        selectedMenu={selectedMenu}
        setSelectedMenu={setSelectedMenu}
        groupCount={groupCount}
        setGroupCount={setGroupCount}
        newDetails={newDetails}
        setNewDetails={setNewDetails}
        onSelectMenuRecipe={onSelectMenuRecipe}
        handleCreateRequest={handleCreateRequest}
        labStockInventory={labStock}
      />

      <RequestDetailModal
        activeRequest={activeRequest}
        role={role}
        currentUser={currentUser}
        onClose={() => setSelectedId(null)}
        editableDetails={editableDetails}
        setEditableDetails={setEditableDetails}
        handleSaveQtyChanges={(id, details) => handleSaveQtyChanges(id, details, role)}
        updateStatus={updateStatus}
        decisionNote={decisionNote}
        setDecisionNote={setDecisionNote}
        setReportingRequestId={setReportingRequestId}
        setReportSpentAmount={setReportSpentAmount}
        exportSingleExcel={(r) => exportSingleExcel(r, notify)}
        exportSinglePdf={(r) => exportSinglePdf(r, notify)}
        waActionData={waActionData}
        setWaActionData={setWaActionData}
      />

      <QuickTransferModal
        quickReviewItem={quickReviewItem}
        onClose={() => setQuickReviewId(null)}
        decisionNote={decisionNote}
        setDecisionNote={setDecisionNote}
        updateStatus={updateStatus}
      />

      <ReportExpenseModal
        reportingRequestId={reportingRequestId}
        onClose={() => setReportingRequestId(null)}
        requests={requests}
        reportSpentAmount={reportSpentAmount}
        setReportSpentAmount={setReportSpentAmount}
        reportReceiptImg={reportReceiptImg}
        setReportReceiptImg={setReportReceiptImg}
        reportReceiptFile={reportReceiptFile}
        setReportReceiptFile={setReportReceiptFile}
        handleReportExpense={handleReportExpense}
      />

      <MasterModalsContainer crud={crud} labStock={labStock} notify={notify} />

      {/* TOAST POPUP */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[70] flex max-w-sm items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-xl text-xs font-bold text-foreground animate-in slide-in-from-bottom-5"
        >
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
