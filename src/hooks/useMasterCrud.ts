import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { SpakeApi } from "@/lib/api-client";
import type {
  StudyProgramData,
  MenuItemRecipe,
  RecipeIngredient,
  UserAccount,
  LabStockItem,
  Role,
} from "@/types/procurement";

interface UseMasterCrudProps {
  curriculum: StudyProgramData[];
  setCurriculum: React.Dispatch<React.SetStateAction<StudyProgramData[]>>;
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  currentUser: UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  labStock: Record<string, LabStockItem>;
  setLabStock: React.Dispatch<React.SetStateAction<Record<string, LabStockItem>>>;
  selectedProdi: string;
  setSelectedProdi: (val: string) => void;
  notify: (msg: string) => void;
}

export function useMasterCrud({
  curriculum,
  setCurriculum,
  users,
  setUsers,
  currentUser,
  setCurrentUser,
  labStock: _labStock,
  setLabStock,
  selectedProdi,
  setSelectedProdi,
  notify,
}: UseMasterCrudProps) {
  // Master Prodi State
  const [adminSelectedProdi, setAdminSelectedProdi] = useState<string>("D3 Perhotelan");
  const [adminSelectedSem, setAdminSelectedSem] = useState<number>(1);
  const [prodiModalOpen, setProdiModalOpen] = useState(false);
  const [newProdiName, setNewProdiName] = useState("");

  // Master Course State
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourseName, setEditingCourseName] = useState<string | null>(null);
  const [courseFormName, setCourseFormName] = useState("");

  // Master Menu State (Kaprodi)
  const [kaprodiSelectedProdi, setKaprodiSelectedProdi] = useState<string>("D3 Perhotelan");
  const [kaprodiSelectedSem, setKaprodiSelectedSem] = useState<number>(1);
  const [kaprodiSelectedCourse, setKaprodiSelectedCourse] = useState<string>(
    "Tata Boga Dasar & Sanitasi Hygiene",
  );
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenuName, setEditingMenuName] = useState<string | null>(null);
  const [menuFormName, setMenuFormName] = useState("");
  const [menuFormIngredients, setMenuFormIngredients] = useState<RecipeIngredient[]>([]);

  // Master User State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Master Stock State
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<{
    name: string;
    stock: number;
    unit: string;
    originalName?: string;
  } | null>(null);

  // Prodi CRUD
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
    if (adminSelectedProdi === prodiToDelete && updated[0]) {
      setAdminSelectedProdi(updated[0].prodiName);
    }
    if (selectedProdi === prodiToDelete && updated[0]) {
      setSelectedProdi(updated[0].prodiName);
    }
    notify(`Program Studi "${prodiToDelete}" berhasil dihapus.`);
  }

  // Course CRUD
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
                  c.courseName === editingCourseName ? { ...c, courseName: cName } : c,
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
      }),
    );

    setCourseModalOpen(false);
    setCourseFormName("");
    setEditingCourseName(null);
    notify(
      editingCourseName
        ? `Mata kuliah berhasil diperbarui menjadi "${cName}".`
        : `Mata kuliah "${cName}" berhasil ditambahkan ke Semester ${adminSelectedSem}.`,
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
      }),
    );
    notify(
      `Mata kuliah "${courseNameToDelete}" berhasil dihapus dari Semester ${adminSelectedSem}.`,
    );
  }

  // Menu CRUD
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
      (ing) => ing.name.trim().length > 0 && ing.neededQty > 0,
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
                        : m,
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
      }),
    );

    setMenuModalOpen(false);
    setEditingMenuName(null);
    setMenuFormName("");
    setMenuFormIngredients([]);
    notify(
      editingMenuName
        ? `Menu masakan "${mName}" dan takaran bahan berhasil diperbarui oleh Kaprodi.`
        : `Menu masakan "${mName}" dan takaran bahan berhasil ditambahkan oleh Kaprodi.`,
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
      }),
    );
    notify(`Menu hidangan "${menuNameToDelete}" berhasil dihapus.`);
  }

  // User CRUD
  async function handleSaveUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const userRole = data.get("role") as Role;
    const department = String(data.get("department") || "").trim();
    const unitId = String(data.get("unit_id") || "").trim() || undefined;
    const password = String(data.get("password") || "password123").trim();

    if (!name || !email) return;

    try {
      if (editingUser) {
        let savedUser: UserAccount = {
          ...editingUser,
          name,
          email,
          role: userRole,
          department,
          unit_id: unitId,
        };

        if (SpakeApi.hasToken()) {
          const res = await SpakeApi.updateUser(editingUser.id, {
            name,
            email,
            role: userRole,
            department,
            unit_id: unitId,
          });
          if (res?.data) {
            savedUser = res.data;
          }
        }

        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...savedUser } : u)));
        if (currentUser && currentUser.id === editingUser.id) {
          setCurrentUser((prev) => (prev ? { ...prev, ...savedUser } : null));
        }
        setUserModalOpen(false);
        setEditingUser(null);
        notify(`Data & peran ${name} berhasil diperbarui menjadi ${userRole}.`);
      } else {
        let createdUser: UserAccount = {
          id: `USR-${String(Date.now()).slice(-3)}`,
          name,
          email,
          role: userRole,
          department,
          unit_id: unitId,
          status: "Aktif",
        };

        if (SpakeApi.hasToken()) {
          const res = await SpakeApi.createUser({
            name,
            email,
            password,
            role: userRole,
            department,
            unit_id: unitId,
          });
          if (res?.data) {
            createdUser = res.data;
          }
        }

        setUsers((prev) => [...prev, createdUser]);
        setUserModalOpen(false);
        notify(`Pengguna ${name} (${userRole}) berhasil ditambahkan.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan pengguna.";
      toast.error(msg);
      notify(msg);
    }
  }

  // Stock CRUD
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

  return {
    adminSelectedProdi,
    setAdminSelectedProdi,
    adminSelectedSem,
    setAdminSelectedSem,
    prodiModalOpen,
    setProdiModalOpen,
    newProdiName,
    setNewProdiName,
    handleAddProdi,
    handleDeleteProdi,
    courseModalOpen,
    setCourseModalOpen,
    editingCourseName,
    setEditingCourseName,
    courseFormName,
    setCourseFormName,
    handleSaveCourse,
    handleDeleteCourse,
    kaprodiSelectedProdi,
    setKaprodiSelectedProdi,
    kaprodiSelectedSem,
    setKaprodiSelectedSem,
    kaprodiSelectedCourse,
    setKaprodiSelectedCourse,
    menuModalOpen,
    setMenuModalOpen,
    editingMenuName,
    setEditingMenuName,
    menuFormName,
    setMenuFormName,
    menuFormIngredients,
    setMenuFormIngredients,
    handleOpenAddMenu,
    handleOpenEditMenu,
    handleSaveMenu,
    handleDeleteMenu,
    userModalOpen,
    setUserModalOpen,
    editingUser,
    setEditingUser,
    handleSaveUser,
    stockModalOpen,
    setStockModalOpen,
    editingStockItem,
    setEditingStockItem,
    handleSaveStock,
    handleDeleteStock,
  };
}
