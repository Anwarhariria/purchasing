import React, { useState, useEffect } from "react";
import { Edit, UserPlus, Check, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpakeApi } from "@/lib/api-client";
import { formatUnitLabel } from "@/lib/utils";
import type { User, Role } from "@/types/procurement";

const SRS_ROLES: { value: Role; label: string }[] = [
  { value: "Asdos Kitchen", label: "Asdos Kitchen (Pemohon Pengadaan Praktikum - Alur A)" },
  { value: "Staf Unit", label: "Staf Unit (Pemohon Pengadaan Logistik & ATK - Alur B)" },
  { value: "Koordinator Lab", label: "Koordinator Lab (Verifikator Alur A Kitchen)" },
  { value: "Koordinator Unit", label: "Koordinator Unit (Verifikator Alur B Unit Kerja)" },
  { value: "Kaprodi", label: "Kaprodi (Persetujuan Alur A Kitchen)" },
  { value: "Keuangan Kitchen", label: "Keuangan Kitchen (Pencairan & SPJ Alur A)" },
  { value: "Keuangan Umum", label: "Keuangan Umum (Alokasi & Belanja Alur B)" },
  { value: "Super Admin", label: "Super Admin (Pengelola Sistem & Master Data)" },
];

const FALLBACK_UNITS = [
  { id: "PMB", nama: "Penerimaan Mahasiswa Baru", kode: "PMB" },
  { id: "PERPUS", nama: "Perpustakaan", kode: "PERPUS" },
  { id: "SEKR-S1", nama: "Sekretariat S1 Terapan Perhotelan", kode: "SEKR-S1" },
  { id: "SEKR-S2", nama: "Sekretariat S2 Terapan Pariwisata", kode: "SEKR-S2" },
  { id: "SEKR-D3", nama: "Sekretariat D3 Perhotelan", kode: "SEKR-D3" },
  { id: "LSP", nama: "Lembaga Sertifikasi Profesi", kode: "LSP" },
];

interface UnitOption {
  id: string;
  nama: string;
  kode?: string;
}

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: User | null;
  setEditingUser: (u: User | null) => void;
  handleSaveUser: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const UserModal: React.FC<UserModalProps> = ({
  open,
  onOpenChange,
  editingUser,
  setEditingUser,
  handleSaveUser,
}) => {
  const [role, setRole] = useState<Role>(editingUser ? editingUser.role : "Staf Unit");
  const [selectedUnitId, setSelectedUnitId] = useState<string>(editingUser?.unit_id || "PMB");
  const [units, setUnits] = useState<UnitOption[]>(FALLBACK_UNITS);

  // Sync state ketika editingUser berubah
  useEffect(() => {
    if (editingUser) {
      setRole(editingUser.role);
      setSelectedUnitId(editingUser.unit_id || "PMB");
    } else {
      setRole("Staf Unit");
      setSelectedUnitId("PMB");
    }
  }, [editingUser, open]);

  // Muat daftar unit dari backend tabel units
  useEffect(() => {
    if (open) {
      SpakeApi.getUnits()
        .then((res) => {
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            setUnits(res.data);
          }
        })
        .catch(() => {
          // Pakai FALLBACK_UNITS jika API gagal
        });
    }
  }, [open]);

  const isUnitRole = role === "Staf Unit" || role === "Koordinator Unit";
  const activeUnitName = units.find((u) => u.id === selectedUnitId)?.nama || "Unit Kerja Kampus";

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) setEditingUser(null);
      }}
    >
      <DialogContent className="max-h-[90vh] w-[95vw] sm:max-w-md overflow-y-auto rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-white">
              {editingUser ? <Edit className="size-4" /> : <UserPlus className="size-4" />}
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                {editingUser ? `Edit Peran Pengguna (${editingUser.id})` : "Tambah Pengguna Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingUser
                  ? "Ubah peran/jabatan atau unit kerja tanpa perlu membuat akun baru."
                  : "Buat akun akses SPAKE dan tetapkan peran (role)."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSaveUser}
          key={editingUser ? editingUser.id : "new"}
          className="space-y-4 px-4 sm:px-6 py-4 sm:py-5"
        >
          <label className="block text-xs font-bold text-foreground">
            Nama Lengkap <span className="text-red-500">*</span>
            <Input
              name="name"
              defaultValue={editingUser ? editingUser.name : ""}
              required
              placeholder="Contoh: Chef Dimas Prasetyo, A.Md.Par."
              className="mt-1.5 h-10 font-normal"
            />
          </label>

          <label className="block text-xs font-bold text-foreground">
            Email Institusi <span className="text-red-500">*</span>
            <Input
              type="email"
              name="email"
              defaultValue={editingUser ? editingUser.email : ""}
              required
              placeholder="Contoh: dimas.perhotelan@asaindo.ac.id"
              className="mt-1.5 h-10 font-normal"
            />
          </label>

          {!editingUser && (
            <label className="block text-xs font-bold text-foreground">
              Kata Sandi Awal <span className="text-red-500">*</span>
              <Input
                type="password"
                name="password"
                defaultValue="password123"
                required
                placeholder="Minimal 3 karakter"
                className="mt-1.5 h-10 font-normal"
              />
            </label>
          )}

          <label className="block text-xs font-bold text-foreground">
            Peran (Role) <span className="text-red-500">*</span>
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-card px-3 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              {SRS_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {/* Untuk Staf Unit / Koordinator Unit: Dropdown Unit dari tabel units */}
          {isUnitRole ? (
            <label className="block text-xs font-bold text-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" />
                Unit Kerja Kampus <span className="text-red-500">*</span>
              </span>
              <select
                name="unit_id"
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                required
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-card px-3 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="" disabled>
                  -- Pilih Unit Kerja Kampus --
                </option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatUnitLabel(u)}
                  </option>
                ))}
              </select>
              <input type="hidden" name="department" value={activeUnitName} />
              <p className="mt-1 text-[11px] text-muted-foreground font-normal">
                Staf Unit dan Koordinator Unit terhubung langsung dengan unit kerja kampus. Hanya
                satu Koordinator diperbolehkan per unit kerja.
              </p>
            </label>
          ) : (
            <label className="block text-xs font-bold text-foreground">
              Unit / Departemen <span className="text-red-500">*</span>
              <select
                name="department"
                defaultValue={
                  editingUser?.department ||
                  (role === "Kaprodi"
                    ? "Program Studi D3 Perhotelan"
                    : role === "Keuangan Kitchen"
                      ? "Keuangan Kitchen (Praktikum & Kasbon)"
                      : role === "Keuangan Umum"
                        ? "Keuangan Umum & Logistik"
                        : role === "Super Admin"
                          ? "Pusat Kendali Sistem & IT"
                          : "Laboratorium Dapur & Restoran Perhotelan")
                }
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-card px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                required
              >
                <option value="Laboratorium Dapur & Restoran Perhotelan">
                  Laboratorium Dapur & Restoran Perhotelan (Kitchen)
                </option>
                <option value="Program Studi D3 Perhotelan">Program Studi D3 Perhotelan</option>
                <option value="Keuangan Kitchen (Praktikum & Kasbon)">
                  Keuangan Kitchen (Praktikum & Kasbon)
                </option>
                <option value="Keuangan Umum & Logistik">Keuangan Umum & Logistik</option>
                <option value="Pusat Kendali Sistem & IT">Pusat Kendali Sistem & IT</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground font-normal">
                Pengaturan unit menentukan jalur verifikasi Koordinator dan pengelolaan Keuangan.
              </p>
            </label>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setEditingUser(null);
              }}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-primary text-primary-foreground font-bold w-full sm:w-auto"
            >
              {editingUser ? (
                <>
                  <Check className="size-4" /> Perbarui Data & Peran
                </>
              ) : (
                <>
                  <UserPlus className="size-4" /> Simpan Pengguna Baru
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
