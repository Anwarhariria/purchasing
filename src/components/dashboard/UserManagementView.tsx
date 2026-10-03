import { Button } from "@/components/ui/button";
import { Users, UserPlus, Edit, KeyRound } from "lucide-react";
import type { UserAccount } from "@/types/procurement";

interface UserManagementViewProps {
  users: UserAccount[];
  onAddUser: () => void;
  onEditUser: (user: UserAccount) => void;
  notify: (msg: string) => void;
}

export function UserManagementView({
  users,
  onAddUser,
  onEditUser,
  notify,
}: UserManagementViewProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Manajemen Pengguna &amp; Hak Akses SPAKE
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelola daftar staf pemohon, koordinator lab, kaprodi, bagian keuangan, dan super admin.
          </p>
        </div>
        <Button
          onClick={onAddUser}
          className="h-9 gap-2 bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:opacity-95 cursor-pointer"
        >
          <UserPlus className="size-4" />
          + Tambah Pengguna Baru
        </Button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3">ID Pengguna</th>
              <th className="px-5 py-3">Nama &amp; Email</th>
              <th className="px-5 py-3">Peran (Role)</th>
              <th className="px-5 py-3">Unit / Departemen</th>
              <th className="px-5 py-3">Status Akun</th>
              <th className="px-5 py-3 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-surface/60">
                <td className="px-5 py-3.5 text-xs font-extrabold text-primary">{u.id}</td>
                <td className="px-5 py-3.5 text-xs">
                  <p className="font-bold text-foreground">{u.name}</p>
                  <p className="text-[11px] text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-5 py-3.5 text-xs">
                  <span className="inline-block rounded-md bg-primary/10 px-2.5 py-0.5 font-bold text-primary">
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs font-medium text-foreground">{u.department}</td>
                <td className="px-5 py-3.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {u.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditUser(u)}
                      className="h-8 gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 hover:border-primary cursor-pointer"
                    >
                      <Edit className="size-3.5" />
                      Edit Peran
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => notify(`Tautan reset kata sandi untuk ${u.email} telah disimulasikan.`)}
                      className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <KeyRound className="size-3.5 text-muted-foreground" />
                      Reset Sandi
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
