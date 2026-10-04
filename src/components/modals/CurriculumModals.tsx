import React from "react";
import { Building2, BookOpen, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProdiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newProdiName: string;
  setNewProdiName: (name: string) => void;
  handleAddProdi: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const ProdiModal: React.FC<ProdiModalProps> = ({
  open,
  onOpenChange,
  newProdiName,
  setNewProdiName,
  handleAddProdi,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-white">
              <Building2 className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-black text-foreground">
                Tambah Program Studi (Jurusan) Baru
              </DialogTitle>
              <DialogDescription className="text-xs">
                Sistem akan otomatis menginisialisasi Semester 1 sampai 8 untuk prodi baru ini.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleAddProdi} className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
          <label className="block text-xs font-bold text-foreground">
            Nama Program Studi / Jurusan <span className="text-red-500">*</span>
            <Input
              required
              value={newProdiName}
              onChange={(e) => setNewProdiName(e.target.value)}
              placeholder="Contoh: D3 Perhotelan Konsentrasi F&B"
              className="mt-1.5 h-10 font-medium"
            />
          </label>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-primary text-primary-foreground font-bold text-xs w-full sm:w-auto"
            >
              <Check className="size-4" /> Simpan Prodi
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface CourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCourseName: string | null;
  adminSelectedProdi: string;
  adminSelectedSem: number;
  courseFormName: string;
  setCourseFormName: (name: string) => void;
  handleSaveCourse: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  open,
  onOpenChange,
  editingCourseName,
  adminSelectedProdi,
  adminSelectedSem,
  courseFormName,
  setCourseFormName,
  handleSaveCourse,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-xl border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-surface px-4 sm:px-6 py-4 sm:py-5 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-white">
              <BookOpen className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-base font-black text-foreground">
                {editingCourseName
                  ? "Edit Mata Kuliah Praktik"
                  : `Tambah Mata Kuliah - Semester ${adminSelectedSem}`}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {adminSelectedProdi} · Semester {adminSelectedSem}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSaveCourse} className="space-y-4 px-4 sm:px-6 py-4 sm:py-5">
          <label className="block text-xs font-bold text-foreground">
            Nama Mata Kuliah Praktik <span className="text-red-500">*</span>
            <Input
              required
              value={courseFormName}
              onChange={(e) => setCourseFormName(e.target.value)}
              placeholder="Contoh: Pengolahan Pastry & Bakery Lanjut"
              className="mt-1.5 h-10 font-medium"
            />
          </label>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="gap-2 bg-primary hover:bg-blue-900 text-white font-bold text-xs w-full sm:w-auto cursor-pointer"
            >
              <Check className="size-4" />{" "}
              {editingCourseName ? "Simpan Perubahan" : "Tambah Mata Kuliah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
