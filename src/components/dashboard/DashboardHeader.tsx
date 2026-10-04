import React from "react";
import { Button } from "@/components/ui/button";
import { Menu, Bell, LogOut, LogIn, ArrowRight } from "lucide-react";
import type { Role, UserAccount, NotificationItem } from "@/types/procurement";

interface DashboardHeaderProps {
  setMobileOpen: (v: boolean) => void;
  role: Role;
  handleRoleChange: (r: Role) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (v: boolean) => void;
  unreadNotifCount: number;
  visibleNotifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  setSelectedId: (id: string) => void;
  currentUser: UserAccount | null;
  handleLogout: () => void;
  setCurrentView: (view: "landing" | "login" | "dashboard") => void;
}

export function DashboardHeader({
  setMobileOpen,
  role,
  handleRoleChange,
  notificationsOpen,
  setNotificationsOpen,
  unreadNotifCount,
  visibleNotifications,
  setNotifications,
  setSelectedId,
  currentUser,
  handleLogout,
  setCurrentView,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[64px] sm:h-[72px] items-center justify-between border-b border-border bg-card/95 backdrop-blur px-3 sm:px-5 xl:px-8 w-full max-w-full">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile hamburger (hanya tampil di layar HP/tablet saat sidebar tersembunyi) */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0 size-9 cursor-pointer"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka navigasi"
        >
          <Menu className="size-5" />
        </Button>
        <div className="font-black text-primary sm:hidden text-base tracking-tight truncate">
          SPAKE
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Notification toggle */}
        <div className="relative shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground size-8 sm:size-9 shrink-0 cursor-pointer"
            aria-label="Lihat Notifikasi"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <Bell className="size-4 sm:size-5" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-2 ring-card animate-pulse">
                {unreadNotifCount}
              </span>
            )}
          </Button>

          {notificationsOpen && (
            <div className="absolute right-0 top-10 sm:top-12 z-50 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 rounded-xl border border-border bg-card p-4 shadow-xl animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-2.5 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Bell className="size-3.5 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Notifikasi {role}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotifCount > 0 ? (
                    <span className="rounded-full bg-red-500/10 text-red-600 px-2 py-0.5 text-[10px] font-bold">
                      {unreadNotifCount} Baru
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Semua terbaca
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((n) =>
                          n.targetRole === role || n.targetRole === "Semua"
                            ? { ...n, read: true }
                            : n
                        )
                      );
                    }}
                  >
                    Tandai Dibaca
                  </Button>
                </div>
              </div>

              <div className="mt-2.5 max-h-80 overflow-y-auto space-y-2 text-xs divide-y divide-border/50">
                {visibleNotifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Belum ada notifikasi untuk peran ini.
                  </div>
                ) : (
                  visibleNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-lg transition-colors pt-2.5 ${
                        !n.read
                          ? "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-foreground text-xs leading-snug">
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        {n.desc}
                      </p>
                      {n.requestId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(n.requestId!);
                            setNotificationsOpen(false);
                          }}
                          className="mt-2 text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Lihat detail {n.requestId} <ArrowRight className="size-2.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Login / Logout Button */}
        {currentUser ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 sm:h-9 px-2 sm:px-3 gap-1.5 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
            title="Keluar ke Halaman Utama"
          >
            <LogOut className="size-4 shrink-0" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => setCurrentView("login")}
            className="h-8 sm:h-9 px-2.5 sm:px-3 gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 cursor-pointer shrink-0"
            title="Buka Halaman Login"
          >
            <LogIn className="size-4 shrink-0" />
            <span className="hidden xs:inline">Masuk</span>
          </Button>
        )}
      </div>
    </header>
  );
}
