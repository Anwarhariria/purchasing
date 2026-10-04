import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, type FormEvent } from "react";
import { SpakeApi } from "@/lib/api-client";
import {
  LayoutDashboard,
  ClipboardList,
  PackageCheck,
  TrendingUp,
  FileText,
  ClipboardCheck,
  Sliders,
  ShieldCheck,
  ChefHat,
  Award,
  Wallet,
  Building2,
  Users,
  CheckCircle2,
  Clock3,
  Plus,
  Eye,
  Check,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Data & Types
import {
  type Role,
  type Status,
  type UserAccount,
  type RequestItem,
  type RequestDetail,
  type NotificationItem,
  type StudyProgramData,
  type MenuItemRecipe,
  type DummyCredential,
  type RecipeIngredient,
} from "@/types/procurement";
import {
  initialRequests,
  initialUsers,
  initialNotifications,
  LAB_STOCK_INVENTORY,
  MASTER_COOKING_CURRICULUM,
} from "@/data/procurement-data";

// Algorithms & Export Utilities
import { calculateFIFO, money } from "@/lib/algorithms/fifo";
import { exportExcel, exportPdf, exportSingleExcel, exportSinglePdf } from "@/lib/export-utils";

// Views & Pages
import { LandingPage } from "@/components/landing/LandingPage";
import { LoginPage } from "@/components/auth/LoginPage";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RoleKpiCards, type RoleMetrics } from "@/components/dashboard/RoleKpiCards";
import { ForecastingView } from "@/components/dashboard/ForecastingView";
import { FifoPriorityView } from "@/components/dashboard/FifoPriorityView";
import { UserManagementView } from "@/components/dashboard/UserManagementView";
import { CurriculumMasterView } from "@/components/dashboard/CurriculumMasterView";
import { RecipeMenuView } from "@/components/dashboard/RecipeMenuView";
import { InventoryStockView } from "@/components/dashboard/InventoryStockView";
import { MonthlyReportView } from "@/components/dashboard/MonthlyReportView";
import { RequestsTableView } from "@/components/dashboard/RequestsTableView";

// Modals
import { CreateRequestModal } from "@/components/modals/CreateRequestModal";
import { RequestDetailModal } from "@/components/modals/RequestDetailModal";
import { QuickTransferModal } from "@/components/modals/QuickTransferModal";
import { ReportExpenseModal } from "@/components/modals/ReportExpenseModal";
import { UserModal } from "@/components/modals/UserModal";
import { ProdiModal, CourseModal } from "@/components/modals/CurriculumModals";
import { MenuModal } from "@/components/modals/MenuModal";
import { StockModal } from "@/components/modals/StockModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SPAKE | Sistem Pengadaan Kampus ASAINDO" },
      {
        name: "description",
        content:
          "Dasbor pengadaan internal Universitas Asa Indonesia untuk pengajuan, pemeriksaan stok, dan persetujuan anggaran.",
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
  const [currentView, setCurrentView] = useState<"landing" | "login" | "dashboard">(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === "#login" || search.includes("view=login") || search.includes("login=true")) {
        return "login";
      }
      if (hash === "#dashboard" || search.includes("view=dashboard")) {
        return "dashboard";
      }
    }
    return "landing";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleHashChange = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === "#login" || search.includes("view=login") || search.includes("login=true")) {
        setCurrentView("login");
      } else if (hash === "#dashboard" || search.includes("view=dashboard")) {
        setCurrentView("dashboard");
      } else if (!hash || hash === "#" || hash === "#landing") {
        setCurrentView("landing");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleGoToLogin = () => {
    setCurrentView("login");
    if (typeof window !== "undefined") {
      window.location.hash = "login";
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const handleBackToLanding = () => {
    setCurrentView("landing");
    if (typeof window !== "undefined") {
      window.location.hash = "";
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [role, setRole] = useState<Role>("Staf / Asdos");
  const [loginEmail, setLoginEmail] = useState("asdos@gmail.com");
  const [loginPassword, setLoginPassword] = useState("123");
  const [loginError, setLoginError] = useState("");

  const [section, setSection] = useState<string>("Ringkasan");
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickReviewId, setQuickReviewId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const [toast, setToast] = useState("");
  const [newDetails, setNewDetails] = useState<RequestDetail[]>([
    { id: "D-tmp-1", name: "", qty: 1, unit: "", price: 0 },
  ]);

  // Master Data Kurikulum & Resep
  const [curriculum, setCurriculum] = useState<StudyProgramData[]>(MASTER_COOKING_CURRICULUM);

  // State Cascading Dropdown Pengajuan
  const [selectedProdi, setSelectedProdi] = useState<string>(
    MASTER_COOKING_CURRICULUM[0]?.prodiName || "D3 Perhotelan"
  );
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedCourse, setSelectedCourse] = useState<string>(
    MASTER_COOKING_CURRICULUM[0]?.semesters[0]?.courses[0]?.courseName || ""
  );
  const [selectedMenu, setSelectedMenu] = useState<string>(
    MASTER_COOKING_CURRICULUM[0]?.semesters[0]?.courses[0]?.menus[0]?.menuName || ""
  );

  // State Super Admin: Kelola Master Prodi & Matakuliah
  const [adminSelectedProdi, setAdminSelectedProdi] = useState<string>(
    MASTER_COOKING_CURRICULUM[0]?.prodiName || "D3 Perhotelan"
  );
  const [adminSelectedSem, setAdminSelectedSem] = useState<number>(1);
  const [prodiModalOpen, setProdiModalOpen] = useState(false);
  const [newProdiName, setNewProdiName] = useState("");
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourseName, setEditingCourseName] = useState<string | null>(null);
  const [courseFormName, setCourseFormName] = useState("");

  // State Kaprodi: Kelola Menu & Bahan
  const [kaprodiSelectedProdi, setKaprodiSelectedProdi] = useState<string>(
    MASTER_COOKING_CURRICULUM[0]?.prodiName || "D3 Perhotelan"
  );
  const [kaprodiSelectedSem, setKaprodiSelectedSem] = useState<number>(1);
  const [kaprodiSelectedCourse, setKaprodiSelectedCourse] = useState<string>("");
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenuName, setEditingMenuName] = useState<string | null>(null);
  const [menuFormName, setMenuFormName] = useState("");
  const [menuFormIngredients, setMenuFormIngredients] = useState<RecipeIngredient[]>([]);

  // State Filter Report Bulanan Staf
  const [reportPeriodMonths, setReportPeriodMonths] = useState<number>(1);

  // State Modal Pelaporan Belanja Asdos (Bon & Selisih Uang)
  const [reportingRequestId, setReportingRequestId] = useState<string | null>(null);
  const [reportSpentAmount, setReportSpentAmount] = useState<number>(0);
  const [reportReceiptImg, setReportReceiptImg] = useState<string>("");

  // Master Data Stok Gudang Laboratorium
  const [labStock, setLabStock] = useState<Record<string, { stock: number; unit: string }>>(
    LAB_STOCK_INVENTORY
  );
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<{
    name: string;
    stock: number;
    unit: string;
    originalName?: string;
  } | null>(null);

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

  useEffect(() => {
    SpakeApi.getRequests()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setRequests(res.data);
        }
      })
      .catch((err) => console.log("Using local state:", err));

    SpakeApi.getNotifications()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setNotifications(res.data);
        }
      })
      .catch(() => {});

    SpakeApi.getUsers()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setUsers(res.data);
        }
      })
      .catch(() => {});
  }, []);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4000);
  }

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    const matched = users.find(
      (u) =>
        u.email.toLowerCase() === loginEmail.trim().toLowerCase() &&
        (u.password || "123") === loginPassword.trim()
    );
    if (!matched) {
      setLoginError("Email atau kata sandi tidak cocok. Gunakan salah satu akun dummy di bawah.");
      return;
    }
    setCurrentUser(matched);
    setRole(matched.role);
    setSection("Ringkasan");
    setCurrentView("dashboard");
    if (typeof window !== "undefined") {
      window.location.hash = "dashboard";
    }
    notify(`Selamat datang, ${matched.name} (${matched.role})!`);
  }

  function handleQuickLogin(account: DummyCredential) {
    setLoginEmail(account.email);
    setLoginPassword(account.pass);
    const matched = users.find((u) => u.email.toLowerCase() === account.email.toLowerCase());
    if (matched) {
      setCurrentUser(matched);
      setRole(matched.role);
      setSection("Ringkasan");
      setCurrentView("dashboard");
      if (typeof window !== "undefined") {
        window.location.hash = "dashboard";
      }
      notify(`Login berhasil sebagai ${matched.role}.`);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setCurrentView("landing");
    if (typeof window !== "undefined") {
      window.location.hash = "";
    }
    setLoginError("");
    notify("Anda telah keluar dari sesi SPAKE.");
  }

  function handleRoleChange(newRole: Role) {
    setRole(newRole);
    const roleUser = users.find((u) => u.role === newRole);
    if (roleUser) {
      setCurrentUser(roleUser);
    }
    setSection("Ringkasan");
    setStatusFilter("Semua Status");
    setMobileOpen(false);
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  function addNotification(
    targetRole: Role | "Semua",
    title: string,
    desc: string,
    requestId?: string
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

  function updateStatus(
    id: string,
    newStatus: Status,
    note?: string,
    extraData?: Partial<RequestItem>
  ) {
    const targetItem = requests.find((r) => r.id === id);
    const itemName = targetItem ? targetItem.item : id;

    let finalExtra: Partial<RequestItem> = extraData || {};
    if (newStatus === "Selesai" && !finalExtra.reimbursementStatus) {
      if (targetItem && targetItem.deficitAmount && targetItem.deficitAmount > 0) {
        finalExtra = { ...finalExtra, reimbursementStatus: "Telah Diganti" };
      } else {
        finalExtra = { ...finalExtra, reimbursementStatus: "Tidak Ada Selisih" };
      }
    }

    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: newStatus, ...(note ? { note } : {}), ...finalExtra } : r
      )
    );
    setSelectedId(null);
    setQuickReviewId(null);
    setDecisionNote("");

    // Background sync to Laravel 12 MySQL backend
    if (newStatus === "Dana Dicairkan" && finalExtra.disbursedAmount) {
      SpakeApi.disburseFunds(id, finalExtra.disbursedAmount, note).catch(() => {});
    } else if (newStatus === "Laporan Belanja Diajukan" && finalExtra.actualSpent !== undefined) {
      SpakeApi.submitSpj(id, finalExtra.actualSpent, finalExtra.receiptImages || [], note).catch(() => {});
    } else if (newStatus === "Selesai") {
      SpakeApi.reimburseDeficit(id, note).catch(() => {});
    } else {
      SpakeApi.updateStatus(id, newStatus, note).catch(() => {});
    }

    if (newStatus === "Diverifikasi Koordinator") {
      addNotification(
        "Kaprodi",
        `${id} Diverifikasi Koordinator Lab`,
        `Standar porsi "${itemName}" telah divalidasi Koordinator dan diteruskan ke Kaprodi.`,
        id
      );
      notify(`Pengajuan ${id} diverifikasi Koordinator & diteruskan ke Kaprodi.`);
    } else if (newStatus === "Disetujui Kaprodi") {
      addNotification(
        "Bagian Keuangan",
        `${id} Disetujui Kaprodi - Siap Dicairkan`,
        `Permohonan bahan "${itemName}" telah di-ACC Kaprodi. Menunggu transfer pencairan dana ke Asdos.`,
        id
      );
      notify(`Pengajuan ${id} disetujui Kaprodi & diajukan ke Bagian Keuangan.`);
    } else if (newStatus === "Dana Dicairkan") {
      addNotification(
        "Staf / Asdos",
        `${id} Dana Telah Ditransfer Keuangan`,
        `Dana pembelian "${itemName}" telah ditransfer ke rekening Asdos. Silakan berangkat belanja.`,
        id
      );
      notify(`Dana pengajuan ${id} berhasil dicairkan/ditransfer ke rekening Asdos.`);
    } else if (newStatus === "Proses Pembelian") {
      addNotification(
        "Koordinator",
        `${id} Asdos Sedang Belanja Bahan`,
        `Asdos sedang membelanjakan bahan masakan "${itemName}" di pasar/supermarket.`,
        id
      );
      notify(`Status ${id} kini dalam proses pembelian oleh Asdos.`);
    } else if (newStatus === "Laporan Belanja Diajukan") {
      addNotification(
        "Bagian Keuangan",
        `${id} Laporan Belanja & Bon Diajukan Asdos`,
        `Asdos telah melampirkan bon belanja untuk "${itemName}". Cek selisih sisa kembalian atau kekurangan dana.`,
        id
      );
      notify(`Laporan belanja & bon untuk ${id} berhasil diajukan ke Bagian Keuangan.`);
    } else if (newStatus === "Selesai") {
      addNotification(
        "Staf / Asdos",
        `${id} LPJ Selesai & Disetujui`,
        `Laporan belanja "${itemName}" telah diverifikasi Keuangan. SPJ resmi ditutup.`,
        id
      );
      addNotification(
        "Kaprodi",
        `${id} Siklus Pengadaan Bahan Selesai`,
        `Bahan masakan "${itemName}" telah digunakan & pertanggungjawaban selesai.`,
        id
      );
      notify(`Konfirmasi berhasil! LPJ ${id} diverifikasi dan transaksi resmi selesai.`);
    } else if (newStatus === "Ditolak") {
      addNotification(
        "Staf / Asdos",
        `${id} Pengajuan Ditolak`,
        `Pengajuan "${itemName}" ditolak: ${note || "Standar atau anggaran belum sesuai."}`,
        id
      );
      notify(`Pengajuan ${id} ditolak.`);
    } else {
      notify(`Status pengajuan ${id} diperbarui menjadi "${newStatus}".`);
    }
  }

  function handleSaveQtyChanges(reqId: string, updatedDetails: RequestDetail[]) {
    const targetReq = requests.find((r) => r.id === reqId);
    if (targetReq) {
      const allowedStatuses =
        role === "Koordinator"
          ? ["Diajukan"]
          : role === "Kaprodi"
          ? ["Diverifikasi Koordinator"]
          : [];
      if (allowedStatuses.length > 0 && !allowedStatuses.includes(targetReq.status)) {
        notify(
          `Perubahan Qty tidak dapat disimpan — pengajuan ini sudah berada di status "${targetReq.status}".`
        );
        return;
      }
    }

    const updatedPrice = updatedDetails.reduce((sum, d) => sum + d.price * d.qty, 0);
    const updatedTotalQty = updatedDetails.reduce((sum, d) => sum + d.qty, 0);

    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === reqId) {
          return {
            ...r,
            details: updatedDetails,
            price: updatedPrice,
            qty: updatedTotalQty,
            note: `Qty disesuaikan oleh ${role} (${new Intl.DateTimeFormat("id-ID", {
              dateStyle: "short",
            }).format(new Date())})`,
          };
        }
        return r;
      })
    );
    notify(`Jumlah Qty bahan untuk ${reqId} berhasil diperbarui.`);
    SpakeApi.updateRequest(reqId, { details: updatedDetails, price: updatedPrice, qty: updatedTotalQty }).catch(() => {});
  }

  function handleReportExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reportingRequestId) return;
    const targetItem = requests.find((r) => r.id === reportingRequestId);
    if (!targetItem) return;

    const disbursed = targetItem.disbursedAmount || targetItem.price;
    const spent = reportSpentAmount;
    let refund = 0;
    let deficit = 0;
    let reimbursementStatus: RequestItem["reimbursementStatus"] = "Tidak Ada Selisih";

    if (disbursed > spent) {
      refund = disbursed - spent;
      reimbursementStatus = "Tidak Ada Selisih";
    } else if (spent > disbursed) {
      deficit = spent - disbursed;
      reimbursementStatus = "Perlu Diganti Keuangan";
    }

    const receiptImgs = reportReceiptImg ? [reportReceiptImg] : targetItem.receiptImages || [];

    updateStatus(
      reportingRequestId,
      "Laporan Belanja Diajukan",
      "Laporan belanja & bon diserahkan oleh Asdos.",
      {
        actualSpent: spent,
        refundAmount: refund,
        deficitAmount: deficit,
        reimbursementStatus,
        receiptImages: receiptImgs,
      }
    );

    setReportingRequestId(null);
    setReportSpentAmount(0);
    setReportReceiptImg("");
  }

  function handleCreateRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const deadline = String(data.get("deadline") || "");
    const urgency = "Normal" as RequestItem["urgency"];
    const academicImportance = (data.get("academicImportance") ||
      "Tinggi") as RequestItem["academicImportance"];
    const purpose = String(data.get("purpose") || "");

    const item = selectedMenu;
    const totalPrice = newDetails.reduce((sum, d) => sum + d.price * d.qty, 0);
    const totalQty = newDetails.reduce((sum, d) => sum + d.qty, 0);

    if (!item || !deadline || newDetails.length === 0 || totalPrice === 0) {
      notify("Data tidak lengkap. Pastikan rincian bahan belanja telah terisi.");
      return;
    }

    const nextNum =
      Math.max(
        0,
        ...requests.map((r) => {
          const parts = r.id.split("-");
          return Number(parts[parts.length - 1]) || 0;
        })
      ) + 1;
    const newId = `PR-2026-${String(nextNum).padStart(3, "0")}`;

    const newReq: RequestItem = {
      id: newId,
      item,
      category: "Bahan Praktik Masak",
      prodi: selectedProdi,
      semester: selectedSemester,
      course: selectedCourse,
      menu: selectedMenu,
      applicant: currentUser ? currentUser.name : "Aura Maharani (Asdos)",
      department: currentUser
        ? currentUser.department
        : "Laboratorium Culinary & Kitchen D3 Perhotelan",
      urgency,
      academicImportance,
      needBy: deadline,
      deadline,
      price: totalPrice,
      status: "Diajukan",
      qty: totalQty,
      unit: "items",
      details: [...newDetails],
      date: new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date()),
      purpose: purpose || `Praktik memasak mata kuliah ${selectedCourse}`,
    };

    setRequests([newReq, ...requests]);
    setFormOpen(false);

    // Sync to Laravel 12 Backend
    SpakeApi.createRequest(newReq).catch(() => {});

    addNotification(
      "Koordinator",
      `${newId} Pengajuan Bahan Baru: ${item}`,
      `Staf / Asdos mengajukan kebutuhan belanja bahan masakan untuk ${selectedCourse}. Menunggu verifikasi standar porsi.`,
      newId
    );

    notify(`Permohonan ${newId} (${item}) berhasil diajukan ke Koordinator Lab.`);
  }

  function onSelectMenuRecipe(
    menuName: string,
    customCourse?: string,
    customSem?: number,
    customProdi?: string,
    customCurriculum = curriculum
  ) {
    setSelectedMenu(menuName);
    const pName = customProdi || selectedProdi;
    const sNum = customSem !== undefined ? customSem : selectedSemester;
    const cName = customCourse || selectedCourse;

    const currentProdiData = customCurriculum.find((p) => p.prodiName === pName);
    const currentSemData = currentProdiData?.semesters.find((s) => s.semester === sNum);
    const currentCourseData = currentSemData?.courses.find((c) => c.courseName === cName);
    const targetMenu = currentCourseData?.menus.find((m) => m.menuName === menuName);

    if (targetMenu && targetMenu.ingredients.length > 0) {
      const generatedDetails: RequestDetail[] = targetMenu.ingredients
        .map((ing, idx) => {
          const labStockItem = labStock[ing.name]?.stock || 0;
          const deficitQty = Math.max(0, ing.neededQty - labStockItem);
          return {
            id: `D-${Date.now()}-${idx}`,
            name: ing.name,
            neededQty: ing.neededQty,
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

  function handleAddProdi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newProdiName.trim();
    if (!name) return;
    if (curriculum.some((p) => p.prodiName.toLowerCase() === name.toLowerCase())) {
      notify("Program Studi dengan nama tersebut sudah ada.");
      return;
    }
    const newProdi: StudyProgramData = {
      prodiName: name,
      semesters: Array.from({ length: 8 }, (_, i) => ({
        semester: i + 1,
        courses: [],
      })),
    };
    setCurriculum((prev) => [...prev, newProdi]);
    setAdminSelectedProdi(name);
    setNewProdiName("");
    setProdiModalOpen(false);
    notify(`Program Studi "${name}" berhasil ditambahkan dengan Semester 1 - 8.`);
  }

  function handleDeleteProdi(prodiToDelete: string) {
    if (curriculum.length <= 1) {
      notify("Minimal harus ada satu Program Studi dalam kurikulum.");
      return;
    }
    const updated = curriculum.filter((p) => p.prodiName !== prodiToDelete);
    setCurriculum(updated);
    if (adminSelectedProdi === prodiToDelete) {
      setAdminSelectedProdi(updated[0].prodiName);
    }
    if (selectedProdi === prodiToDelete) {
      setSelectedProdi(updated[0].prodiName);
    }
    notify(`Program Studi "${prodiToDelete}" berhasil dihapus.`);
  }

  function handleSaveCourse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cName = courseFormName.trim();
    if (!cName) return;

    setCurriculum((prev) =>
      prev.map((p) => {
        if (p.prodiName !== adminSelectedProdi) return p;
        return {
          ...p,
          semesters: p.semesters.map((s) => {
            if (s.semester !== adminSelectedSem) return s;
            if (editingCourseName) {
              return {
                ...s,
                courses: s.courses.map((c) =>
                  c.courseName === editingCourseName ? { ...c, courseName: cName } : c
                ),
              };
            } else {
              if (s.courses.some((c) => c.courseName.toLowerCase() === cName.toLowerCase())) {
                return s;
              }
              return {
                ...s,
                courses: [...s.courses, { courseName: cName, menus: [] }],
              };
            }
          }),
        };
      })
    );

    setCourseModalOpen(false);
    setCourseFormName("");
    setEditingCourseName(null);
    notify(
      editingCourseName
        ? `Mata kuliah berhasil diperbarui menjadi "${cName}".`
        : `Mata kuliah "${cName}" berhasil ditambahkan ke Semester ${adminSelectedSem}.`
    );
  }

  function handleDeleteCourse(courseNameToDelete: string) {
    setCurriculum((prev) =>
      prev.map((p) => {
        if (p.prodiName !== adminSelectedProdi) return p;
        return {
          ...p,
          semesters: p.semesters.map((s) => {
            if (s.semester !== adminSelectedSem) return s;
            return {
              ...s,
              courses: s.courses.filter((c) => c.courseName !== courseNameToDelete),
            };
          }),
        };
      })
    );
    notify(
      `Mata kuliah "${courseNameToDelete}" berhasil dihapus dari Semester ${adminSelectedSem}.`
    );
  }

  function handleOpenAddMenu(courseName: string) {
    setKaprodiSelectedCourse(courseName);
    setEditingMenuName(null);
    setMenuFormName("");
    setMenuFormIngredients([{ name: "", neededQty: 1, unit: "kg", pricePerUnit: 15000 }]);
    setMenuModalOpen(true);
  }

  function handleOpenEditMenu(courseName: string, menu: MenuItemRecipe) {
    setKaprodiSelectedCourse(courseName);
    setEditingMenuName(menu.menuName);
    setMenuFormName(menu.menuName);
    setMenuFormIngredients(JSON.parse(JSON.stringify(menu.ingredients)));
    setMenuModalOpen(true);
  }

  function handleSaveMenu(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const mName = menuFormName.trim();
    if (!mName) {
      notify("Nama hidangan / menu masakan wajib diisi.");
      return;
    }
    const validIngredients = menuFormIngredients.filter(
      (ing) => ing.name.trim().length > 0 && ing.neededQty > 0
    );
    if (validIngredients.length === 0) {
      notify("Minimal satu bahan masakan harus diisi dengan takaran lebih dari 0.");
      return;
    }

    setCurriculum((prev) =>
      prev.map((p) => {
        if (p.prodiName !== kaprodiSelectedProdi) return p;
        return {
          ...p,
          semesters: p.semesters.map((s) => {
            if (s.semester !== kaprodiSelectedSem) return s;
            return {
              ...s,
              courses: s.courses.map((c) => {
                if (c.courseName !== kaprodiSelectedCourse) return c;
                if (editingMenuName) {
                  return {
                    ...c,
                    menus: c.menus.map((m) =>
                      m.menuName === editingMenuName
                        ? { menuName: mName, ingredients: validIngredients }
                        : m
                    ),
                  };
                } else {
                  return {
                    ...c,
                    menus: [...c.menus, { menuName: mName, ingredients: validIngredients }],
                  };
                }
              }),
            };
          }),
        };
      })
    );

    setMenuModalOpen(false);
    setEditingMenuName(null);
    setMenuFormName("");
    setMenuFormIngredients([]);
    notify(
      editingMenuName
        ? `Menu masakan "${mName}" dan takaran bahan berhasil diperbarui oleh Kaprodi.`
        : `Menu masakan "${mName}" dan takaran bahan berhasil ditambahkan oleh Kaprodi.`
    );
  }

  function handleDeleteMenu(courseName: string, menuNameToDelete: string) {
    setCurriculum((prev) =>
      prev.map((p) => {
        if (p.prodiName !== kaprodiSelectedProdi) return p;
        return {
          ...p,
          semesters: p.semesters.map((s) => {
            if (s.semester !== kaprodiSelectedSem) return s;
            return {
              ...s,
              courses: s.courses.map((c) => {
                if (c.courseName !== courseName) return c;
                return {
                  ...c,
                  menus: c.menus.filter((m) => m.menuName !== menuNameToDelete),
                };
              }),
            };
          }),
        };
      })
    );
    notify(`Menu hidangan "${menuNameToDelete}" berhasil dihapus.`);
  }

  function handleSaveUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const userRole = data.get("role") as Role;
    const department = String(data.get("department") || "").trim();

    if (!name || !email) return;

    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, name, email, role: userRole, department } : u
        )
      );
      if (currentUser && currentUser.id === editingUser.id) {
        setCurrentUser((prev) =>
          prev ? { ...prev, name, email, role: userRole, department } : null
        );
      }
      setUserModalOpen(false);
      setEditingUser(null);
      notify(`Data & peran ${name} berhasil diperbarui menjadi ${userRole}.`);
    } else {
      const maxNum = Math.max(0, ...users.map((u) => Number(u.id.replace(/\D/g, "")) || 0));
      const nextId = `USR-${String(maxNum + 1).padStart(3, "0")}`;
      setUsers([
        ...users,
        { id: nextId, name, email, role: userRole, department, status: "Aktif" },
      ]);
      setUserModalOpen(false);
      notify(`Pengguna ${name} (${userRole}) berhasil ditambahkan.`);
    }
  }

  function handleSaveStock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const selectedName = String(data.get("selectedName") || "").trim();
    const customName = String(data.get("customName") || "").trim();
    const name = customName || selectedName;
    const inputAmount = Number(data.get("stock")) || 0;
    const inputType = String(data.get("inputType") || "masuk");
    const unit = String(data.get("unit") || "kg").trim();

    if (!name) {
      notify("Pilih atau masukkan nama bahan masakan.");
      return;
    }

    if (inputAmount < 0) {
      notify("Jumlah bahan tidak boleh kurang dari 0.");
      return;
    }

    setLabStock((prev) => {
      const updated = { ...prev };
      const currentItem = prev[name];
      let newStock = inputAmount;

      if (inputType === "masuk" && currentItem) {
        newStock = Number((currentItem.stock + inputAmount).toFixed(2));
      } else {
        newStock = inputAmount;
      }

      if (
        editingStockItem &&
        editingStockItem.originalName &&
        editingStockItem.originalName !== name
      ) {
        delete updated[editingStockItem.originalName];
      }

      updated[name] = { stock: newStock, unit: unit || currentItem?.unit || "kg" };
      return updated;
    });

    setStockModalOpen(false);
    setEditingStockItem(null);
    notify(`Stok bahan "${name}" berhasil diperbarui di inventaris laboratorium.`);
  }

  function handleDeleteStock(itemNameToDelete: string) {
    setLabStock((prev) => {
      const updated = { ...prev };
      delete updated[itemNameToDelete];
      return updated;
    });
    notify(`Bahan "${itemNameToDelete}" berhasil dihapus dari inventaris laboratorium.`);
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

  const sidebarNav = useMemo(() => {
    switch (role) {
      case "Staf / Asdos":
        return [
          { label: "Ringkasan", icon: LayoutDashboard },
          { label: "Permohonan", icon: ClipboardList, count: requests.length },
          {
            label: "Inventaris Stok Lab",
            icon: PackageCheck,
            count: Object.keys(labStock).length,
          },
          { label: "Peramalan Bahan (Forecasting)", icon: TrendingUp },
          { label: "Report Bulanan", icon: FileText },
        ];
      case "Koordinator":
        return [
          { label: "Ringkasan", icon: LayoutDashboard },
          {
            label: "Verifikasi Standar Bahan",
            icon: ClipboardCheck,
            count: requests.filter((r) => r.status === "Diajukan").length,
          },
          { label: "Prioritas Belanja (FIFO)", icon: Clock3 },
          { label: "Peramalan Bahan (Forecasting)", icon: TrendingUp },
          { label: "Laporan", icon: FileText },
        ];
      case "Kaprodi":
        return [
          { label: "Ringkasan", icon: LayoutDashboard },
          {
            label: "Persetujuan Kurikulum",
            icon: ShieldCheck,
            count: requests.filter((r) => r.status === "Diverifikasi Koordinator").length,
          },
          { label: "Kelola Menu & Bahan", icon: ChefHat },
          { label: "Prioritas Belanja (FIFO)", icon: Clock3 },
          { label: "Peramalan Bahan (Forecasting)", icon: TrendingUp },
          { label: "Laporan", icon: FileText },
        ];
      case "Bagian Keuangan":
        return [
          { label: "Ringkasan", icon: LayoutDashboard },
          {
            label: "Pencairan Dana",
            icon: Wallet,
            count: requests.filter((r) => r.status === "Disetujui Kaprodi").length,
          },
          {
            label: "Verifikasi LPJ Belanja",
            icon: FileText,
            count: requests.filter((r) => r.status === "Laporan Belanja Diajukan").length,
          },
          { label: "Laporan", icon: FileText },
        ];
      case "Super Admin":
        return [
          { label: "Ringkasan", icon: LayoutDashboard },
          { label: "Master Permohonan", icon: ClipboardList },
          { label: "Master Prodi & Matakuliah", icon: Building2 },
          { label: "Pengguna & Peran", icon: Users, count: users.length },
          { label: "Peramalan Bahan (Forecasting)", icon: TrendingUp },
          { label: "Laporan Sistem", icon: FileText },
        ];
    }
  }, [role, requests, users, labStock]);

  const visibleRequests = useMemo(() => {
    let list = requests;
    if (role === "Staf / Asdos") {
      if (currentUser) {
        list = list.filter((r) => r.applicant === currentUser.name);
      }
    } else if (role === "Koordinator" && section === "Verifikasi Standar Bahan") {
      list = list.filter((r) => r.status === "Diajukan");
    } else if (role === "Kaprodi" && section === "Persetujuan Kurikulum") {
      list = list.filter((r) => r.status === "Diverifikasi Koordinator");
    } else if (role === "Bagian Keuangan" && section === "Pencairan Dana") {
      list = list.filter((r) => r.status === "Disetujui Kaprodi");
    } else if (role === "Bagian Keuangan" && section === "Verifikasi LPJ Belanja") {
      list = list.filter((r) => r.status === "Laporan Belanja Diajukan");
    }

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.item.toLowerCase().includes(q) ||
          (r.menu && r.menu.toLowerCase().includes(q)) ||
          r.applicant.toLowerCase().includes(q) ||
          (r.course && r.course.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "Semua Status") {
      list = list.filter((r) => r.status === statusFilter);
    }

    return list;
  }, [requests, role, section, currentUser, query, statusFilter]);

  const roleMetrics: RoleMetrics = useMemo(() => {
    const list =
      role === "Staf / Asdos" && currentUser
        ? requests.filter((r) => r.applicant === currentUser.name)
        : requests;

    return {
      total: list.length,
      waiting: list.filter((r) => r.status === "Diajukan").length,
      inProcess: list.filter((r) =>
        ["Diverifikasi Koordinator", "Disetujui Kaprodi", "Dana Dicairkan", "Proses Pembelian"].includes(
          r.status
        )
      ).length,
      done: list.filter((r) => r.status === "Selesai").length,
      needReview: requests.filter((r) => r.status === "Diajukan").length,
      needApprove: requests.filter((r) => r.status === "Diverifikasi Koordinator").length,
      needDisbursement: requests.filter((r) => r.status === "Disetujui Kaprodi").length,
      needLpjVerify: requests.filter((r) => r.status === "Laporan Belanja Diajukan").length,
      totalEst: list.reduce((s, r) => s + r.price, 0),
      totalDisbursed: list.reduce((s, r) => s + (r.disbursedAmount || 0), 0),
      usersCount: users.length,
      activeProc: requests.filter((r) => !["Selesai", "Ditolak"].includes(r.status)).length,
    };
  }, [requests, role, currentUser, users]);

  const fifoRankings = useMemo(() => calculateFIFO(requests), [requests]);

  const financeUrgentItem = useMemo(() => {
    return requests.find(
      (r) => r.status === "Disetujui Kaprodi" || r.status === "Laporan Belanja Diajukan"
    );
  }, [requests]);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => n.targetRole === role || n.targetRole === "Semua");
  }, [notifications, role]);

  const unreadNotifCount = useMemo(() => {
    return visibleNotifications.filter((n) => !n.read).length;
  }, [visibleNotifications]);

  // RENDER VIEW: LANDING
  if (currentView === "landing") {
    return (
      <LandingPage
        onGoToLogin={handleGoToLogin}
        onQuickRoleLogin={(user, userRole) => {
          setCurrentUser(user);
          setRole(userRole);
          setSection("Ringkasan");
          setCurrentView("dashboard");
          if (typeof window !== "undefined") {
            window.location.hash = "dashboard";
          }
          notify(`Masuk sebagai ${userRole} (${user.name})`);
        }}
        initialUsers={users}
      />
    );
  }

  // RENDER VIEW: LOGIN
  if (currentView === "login") {
    return (
      <LoginPage
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        onLogin={handleLogin}
        onQuickLogin={handleQuickLogin}
        onBackToLanding={handleBackToLanding}
      />
    );
  }

  // RENDER VIEW: DASHBOARD
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-background font-sans text-foreground w-full overflow-x-hidden">
      {/* SIDEBAR */}
      <Sidebar
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        role={role}
        section={section}
        setSection={setSection}
        sidebarNav={sidebarNav}
        exportExcel={() => exportExcel(requests)}
        exportPdf={() => exportPdf(requests)}
        notify={notify}
        currentUser={currentUser}
        onOpenCreateRequest={() => setFormOpen(true)}
        onOpenAddStock={() => {
          setSection("Inventaris Stok Lab");
          setEditingStockItem(null);
          setStockModalOpen(true);
        }}
        onOpenAddUser={() => {
          setSection("Pengguna & Peran");
          setEditingUser(null);
          setUserModalOpen(true);
        }}
        onOpenAddProdi={() => {
          setSection("Master Prodi & Matakuliah");
          setNewProdiName("");
          setProdiModalOpen(true);
        }}
        onOpenAddCourse={() => {
          setSection("Master Prodi & Matakuliah");
          setEditingCourseName(null);
          setCourseFormName("");
          setCourseModalOpen(true);
        }}
        onOpenAddMenu={() => {
          setSection("Kelola Menu & Bahan");
          const defaultCourse =
            kaprodiSelectedCourse ||
            curriculum[0]?.semesters[0]?.courses[0]?.courseName ||
            "Praktik Tata Boga";
          handleOpenAddMenu(defaultCourse);
        }}
        onQuickReviewFinance={() => {
          if (financeUrgentItem) {
            setQuickReviewId(financeUrgentItem.id);
          } else {
            setSection("Perlu Tindakan Dana");
          }
        }}
        onOpenFifoPriority={() => {
          setSection("Prioritas Belanja (FIFO)");
        }}
        onOpenSawPriority={() => {
          setSection("Prioritas Belanja (FIFO)");
        }}
        onOpenVerify={() => {
          if (role === "Koordinator") {
            setSection("Verifikasi Berkas");
          } else if (role === "Kaprodi") {
            setSection("Verifikasi Kaprodi");
          } else if (role === "Bagian Keuangan") {
            setSection("LPJ & Sisa Uang");
          }
        }}
      />

      {/* MAIN CONTENT AREA */}
      <div
        className={`flex flex-1 flex-col min-w-0 overflow-x-hidden transition-[padding] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          sidebarCollapsed ? "lg:pl-0" : "lg:pl-[265px]"
        }`}
      >
        {/* TOP NAVBAR HEADER */}
        <DashboardHeader
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          setMobileOpen={setMobileOpen}
          role={role}
          handleRoleChange={handleRoleChange}
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          unreadNotifCount={unreadNotifCount}
          visibleNotifications={visibleNotifications}
          setNotifications={setNotifications}
          setSelectedId={(id) => setSelectedId(id)}
          currentUser={currentUser}
          handleLogout={handleLogout}
          setCurrentView={setCurrentView}
        />

        {/* MAIN BODY */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-3.5 py-4 sm:px-8 sm:py-8 xl:px-10 min-w-0">
          {/* Page Header */}
          <div className="animate-slide-up-fade stagger-1 mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#0f172a] dark:text-slate-100">
                <span className="h-0.5 w-3 sm:w-4 bg-[#0f172a] dark:bg-slate-100" />
                SPAKE WORKSPACE · {role.toUpperCase()}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground">
                {role === "Staf / Asdos" &&
                  (section === "Ringkasan" ? "Dashboard Staf / Asdos Lab" : section)}
                {role === "Koordinator" &&
                  (section === "Ringkasan" ? "Dashboard Koordinator Lab" : section)}
                {role === "Kaprodi" && (section === "Ringkasan" ? "Dashboard Kaprodi" : section)}
                {role === "Bagian Keuangan" &&
                  (section === "Ringkasan" ? "Dashboard Bagian Keuangan" : section)}
                {role === "Super Admin" &&
                  (section === "Ringkasan" ? "Dashboard Super Admin" : section)}
              </h1>
            </div>
          </div>

          {/* Quick Action Banner for Bagian Keuangan */}
          {role === "Bagian Keuangan" && financeUrgentItem && (
            <div className="animate-slide-up-fade stagger-2 mb-6 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-colors hover:border-blue-400">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
                    <Clock3 className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0f172a] dark:text-slate-100">
                        {financeUrgentItem.id}
                      </span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      {financeUrgentItem.status === "Disetujui Kaprodi" ? (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                          Menunggu Transfer Dana ke Asdos
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-[#0f172a] border border-slate-300">
                          LPJ Belanja Diajukan Asdos
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {financeUrgentItem.course} ·{" "}
                        {financeUrgentItem.menu || financeUrgentItem.item}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-foreground">
                      {financeUrgentItem.item}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                      <span>
                        Pemohon:{" "}
                        <strong className="text-foreground font-semibold">
                          {financeUrgentItem.applicant} ({financeUrgentItem.department})
                        </strong>
                      </span>
                      <span>
                        Nominal:{" "}
                        <strong className="text-foreground font-bold">
                          {money(financeUrgentItem.disbursedAmount || financeUrgentItem.price)}
                        </strong>
                      </span>
                      <span>
                        Tenggat:{" "}
                        <strong className="text-foreground font-semibold">
                          {financeUrgentItem.deadline || financeUrgentItem.needBy}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedId(financeUrgentItem.id)}
                    className="h-9 px-3.5 text-xs font-semibold hover:border-primary/50"
                  >
                    <Eye className="size-3.5 mr-1.5" /> Detail
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setQuickReviewId(financeUrgentItem.id)}
                    className="h-9 gap-1.5 bg-primary hover:bg-blue-900 text-white font-bold px-4 text-xs shadow-xs cursor-pointer"
                  >
                    <Check className="size-3.5" />{" "}
                    {financeUrgentItem.status === "Disetujui Kaprodi"
                      ? "Transfer Dana"
                      : "Tinjau LPJ"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ROLE KPI CARDS */}
          {section === "Ringkasan" && (
            <RoleKpiCards role={role} roleMetrics={roleMetrics} requests={requests} />
          )}

          {/* DYNAMIC VIEWS ACCORDING TO CURRENT TAB/SECTION */}
          {section === "Peramalan Bahan (Forecasting)" && (
            <ForecastingView
              labStock={labStock}
              onCreateRequestFromForecast={(detail) => {
                setNewDetails([
                  {
                    id: `D-FC-${Date.now()}`,
                    name: detail.name,
                    qty: detail.qty,
                    unit: detail.unit,
                    price: detail.price,
                  },
                ]);
                setFormOpen(true);
                notify(
                  `Draf pengajuan otomatis terisi dengan kebutuhan peramalan ${detail.name} (${detail.qty} ${detail.unit}).`
                );
              }}
              notify={notify}
            />
          )}

          {(section === "Prioritas Belanja" || section === "Prioritas Belanja (FIFO)") && (
            <FifoPriorityView
              fifoRankings={fifoRankings}
              role={role}
              exportCsv={() => exportExcel(requests)}
              setQuickReviewId={(id) => setQuickReviewId(id)}
              updateStatus={(id, s) => updateStatus(id, s)}
              setSelectedId={(id) => setSelectedId(id)}
            />
          )}

          {section === "Pengguna & Peran" && role === "Super Admin" && (
            <UserManagementView
              users={users}
              onAddUser={() => {
                setEditingUser(null);
                setUserModalOpen(true);
              }}
              onEditUser={(u) => {
                setEditingUser(u);
                setUserModalOpen(true);
              }}
              notify={notify}
            />
          )}

          {section === "Master Prodi & Matakuliah" && role === "Super Admin" && (
            <CurriculumMasterView
              curriculum={curriculum}
              adminSelectedProdi={adminSelectedProdi}
              setAdminSelectedProdi={setAdminSelectedProdi}
              adminSelectedSem={adminSelectedSem}
              setAdminSelectedSem={setAdminSelectedSem}
              onOpenAddProdi={() => {
                setNewProdiName("");
                setProdiModalOpen(true);
              }}
              onDeleteProdi={handleDeleteProdi}
              onOpenAddCourse={(sem) => {
                setAdminSelectedSem(sem);
                setEditingCourseName(null);
                setCourseFormName("");
                setCourseModalOpen(true);
              }}
              onOpenEditCourse={(courseName) => {
                setEditingCourseName(courseName);
                setCourseFormName(courseName);
                setCourseModalOpen(true);
              }}
              onDeleteCourse={handleDeleteCourse}
            />
          )}

          {section === "Kelola Menu & Bahan" && role === "Kaprodi" && (
            <RecipeMenuView
              curriculum={curriculum}
              kaprodiSelectedProdi={kaprodiSelectedProdi}
              setKaprodiSelectedProdi={setKaprodiSelectedProdi}
              kaprodiSelectedSem={kaprodiSelectedSem}
              setKaprodiSelectedSem={setKaprodiSelectedSem}
              kaprodiSelectedCourse={kaprodiSelectedCourse}
              setKaprodiSelectedCourse={setKaprodiSelectedCourse}
              onOpenAddMenu={handleOpenAddMenu}
              onOpenEditMenu={handleOpenEditMenu}
              onDeleteMenu={handleDeleteMenu}
            />
          )}

          {section === "Inventaris Stok Lab" && role === "Staf / Asdos" && (
            <InventoryStockView
              labStock={labStock}
              onQuickAdjustStock={handleQuickAdjustStock}
              onEditStockItem={(item) => {
                setEditingStockItem({
                  name: item.name,
                  stock: item.stock,
                  unit: item.unit,
                  originalName: item.name,
                });
                setStockModalOpen(true);
              }}
              onDeleteStock={handleDeleteStock}
            />
          )}

          {(section.includes("Laporan") || section === "Report Bulanan") && (
            <MonthlyReportView
              section={section}
              requests={requests}
              reportPeriodMonths={reportPeriodMonths}
              setReportPeriodMonths={setReportPeriodMonths}
              setSelectedId={(id) => setSelectedId(id)}
              exportExcel={() => exportExcel(requests)}
              exportPdf={() => exportPdf(requests)}
              exportSingleExcel={(r) => exportSingleExcel(r, notify)}
              exportSinglePdf={(r) => exportSinglePdf(r, notify)}
            />
          )}

          {/* MAIN DATA TABLE VIEW */}
          {(section === "Ringkasan" ||
            section === "Permohonan" ||
            section === "Verifikasi Standar Bahan" ||
            section === "Persetujuan Kurikulum" ||
            section === "Pencairan Dana" ||
            section === "Verifikasi LPJ Belanja" ||
            section === "Master Permohonan") && (
            <RequestsTableView
              role={role}
              section={section}
              visibleRequests={visibleRequests}
              requests={requests}
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
            SPAKE · Sistem Pengadaan Kampus Universitas Asa Indonesia (Demo In-Memory Mode)
          </p>
        </main>
      </div>

      {/* ALL MODALS */}
      <CreateRequestModal
        open={formOpen}
        onOpenChange={setFormOpen}
        curriculum={curriculum}
        selectedProdi={selectedProdi}
        setSelectedProdi={setSelectedProdi}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        selectedCourse={selectedCourse}
        setSelectedCourse={setSelectedCourse}
        selectedMenu={selectedMenu}
        setSelectedMenu={setSelectedMenu}
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
        handleSaveQtyChanges={handleSaveQtyChanges}
        updateStatus={updateStatus}
        decisionNote={decisionNote}
        setDecisionNote={setDecisionNote}
        setReportingRequestId={setReportingRequestId}
        setReportSpentAmount={setReportSpentAmount}
        exportSingleExcel={(r) => exportSingleExcel(r, notify)}
        exportSinglePdf={(r) => exportSinglePdf(r, notify)}
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
        handleReportExpense={handleReportExpense}
      />

      <UserModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        editingUser={editingUser}
        setEditingUser={setEditingUser}
        handleSaveUser={handleSaveUser}
      />

      <ProdiModal
        open={prodiModalOpen}
        onOpenChange={setProdiModalOpen}
        newProdiName={newProdiName}
        setNewProdiName={setNewProdiName}
        handleAddProdi={handleAddProdi}
      />

      <CourseModal
        open={courseModalOpen}
        onOpenChange={setCourseModalOpen}
        editingCourseName={editingCourseName}
        adminSelectedProdi={adminSelectedProdi}
        adminSelectedSem={adminSelectedSem}
        courseFormName={courseFormName}
        setCourseFormName={setCourseFormName}
        handleSaveCourse={handleSaveCourse}
      />

      <MenuModal
        open={menuModalOpen}
        onOpenChange={setMenuModalOpen}
        editingMenuName={editingMenuName}
        kaprodiSelectedCourse={kaprodiSelectedCourse}
        kaprodiSelectedSem={kaprodiSelectedSem}
        kaprodiSelectedProdi={kaprodiSelectedProdi}
        menuFormName={menuFormName}
        setMenuFormName={setMenuFormName}
        menuFormIngredients={menuFormIngredients}
        setMenuFormIngredients={setMenuFormIngredients}
        handleSaveMenu={handleSaveMenu}
        notify={notify}
      />

      <StockModal
        open={stockModalOpen}
        onOpenChange={setStockModalOpen}
        editingStockItem={editingStockItem}
        setEditingStockItem={setEditingStockItem}
        labStock={labStock}
        handleSaveStock={handleSaveStock}
      />

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