import React from "react";
import { Edit, UserPlus, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@/types/procurement";

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

          <label className="block text-xs font-bold text-foreground">
            Peran (Role) <span className="text-red-500">*</span>
            <select
              name="role"
              defaultValue={editingUser ? editingUser.role : "Staf / Asdos"}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-card px-3 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <option value="Staf / Asdos">Staf / Asdos (Pemohon Lab Masak)</option>
              <option value="Koordinator">Koordinator Lab</option>
              <option value="Kaprodi">Kaprodi</option>
              <option value="Bagian Keuangan">Bagian Keuangan</option>
              <option value="Super Admin">Super Admin</option>
            </select>
          </label>

          <label className="block text-xs font-bold text-foreground">
            Unit / Departemen <span className="text-red-500">*</span>
            <Input
              name="department"
              defaultValue={editingUser ? editingUser.department : ""}
              required
              placeholder="Contoh: Lab Perhotelan & Dapur Praktik Kuliner"
              className="mt-1.5 h-10 font-normal"
            />
          </label>

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
