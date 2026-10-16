import { useState, useEffect, type FormEvent } from "react";
import type { Role, UserAccount, DummyCredential } from "@/types/procurement";
import { SpakeApi } from "@/lib/api-client";

export function useAuthSession(
  users: UserAccount[] = [],
  notify: (msg: string) => void,
  onResetSection?: (defaultSection: string) => void,
) {
  const [currentView, setCurrentView] = useState<"login" | "dashboard">("login");
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const [loginEmail, setLoginEmail] = useState("asdos@gmail.com");
  const [loginPassword, setLoginPassword] = useState("123");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Sync saved user & role from localStorage safely on client
    try {
      const saved = localStorage.getItem("spake_user");
      const token = localStorage.getItem("spake_token");
      if (saved && token) {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
        if (parsed?.role) setRole(parsed.role as Role);
      } else {
        setCurrentUser(null);
        setRole(null);
      }
    } catch (e) {
      setCurrentUser(null);
      setRole(null);
    }

    // 2. Sync initial view based on URL hash / search parameters
    const initialHash = window.location.hash;
    const initialSearch = window.location.search;
    if (initialHash === "#dashboard" || initialSearch.includes("view=dashboard")) {
      setCurrentView("dashboard");
    } else {
      setCurrentView("login");
    }

    const handleHashChange = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === "#dashboard" || search.includes("view=dashboard")) {
        setCurrentView("dashboard");
      } else {
        setCurrentView("login");
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
    handleGoToLogin();
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (currentUser) {
        localStorage.setItem("spake_user", JSON.stringify(currentUser));
        localStorage.setItem("spake_role", currentUser.role);
      } else {
        localStorage.removeItem("spake_user");
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (role) {
        localStorage.setItem("spake_role", role);
      } else {
        localStorage.removeItem("spake_role");
      }
    }
  }, [role]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await SpakeApi.login(loginEmail.trim(), loginPassword.trim());
      if (res && res.user) {
        setCurrentUser(res.user);
        setRole(res.user.role as Role);
        onResetSection?.("Ringkasan");
        setCurrentView("dashboard");
        if (typeof window !== "undefined") {
          window.location.hash = "dashboard";
        }
        notify(`Selamat datang, ${res.user.name} (${res.user.role})!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429") || msg.toLowerCase().includes("terlalu banyak")) {
        setLoginError("Terlalu banyak percobaan login. Coba lagi dalam 1 menit.");
      } else {
        setLoginError(msg || "Email atau kata sandi tidak valid.");
      }
    }
  }

  async function handleQuickLogin(account: {
    email: string;
    pass: string;
    role?: Role;
    label?: string;
  }) {
    setLoginEmail(account.email);
    setLoginPassword(account.pass);
    setLoginError("");
    try {
      const res = await SpakeApi.login(account.email, account.pass);
      if (res && res.user) {
        setCurrentUser(res.user);
        setRole(res.user.role as Role);
        onResetSection?.("Ringkasan");
        setCurrentView("dashboard");
        if (typeof window !== "undefined") {
          window.location.hash = "dashboard";
        }
        notify(`Login berhasil sebagai ${res.user.role}.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429") || msg.toLowerCase().includes("terlalu banyak")) {
        setLoginError("Terlalu banyak percobaan login. Coba lagi dalam 1 menit.");
      } else {
        setLoginError(msg || "Gagal masuk menggunakan akun demo.");
      }
    }
  }

  async function handleLogout() {
    try {
      await SpakeApi.logout();
    } catch {
      // ignore logout errors on client teardown
    }
    setCurrentUser(null);
    setRole(null);
    setCurrentView("login");
    if (typeof window !== "undefined") {
      localStorage.removeItem("spake_user");
      localStorage.removeItem("spake_role");
      localStorage.removeItem("spake_token");
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
    onResetSection?.("Ringkasan");
    notify(`Mode peran dialihkan ke: ${newRole}`);
  }

  return {
    currentView,
    setCurrentView,
    currentUser,
    setCurrentUser,
    role,
    setRole,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginError,
    setLoginError,
    handleGoToLogin,
    handleBackToLanding,
    handleLogin,
    handleQuickLogin,
    handleLogout,
    handleRoleChange,
  };
}
