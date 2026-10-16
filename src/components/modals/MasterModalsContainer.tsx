import React from "react";
import type { LabStockItem } from "@/types/procurement";
import { UserModal } from "@/components/modals/UserModal";
import { ProdiModal, CourseModal } from "@/components/modals/CurriculumModals";
import { MenuModal } from "@/components/modals/MenuModal";
import { StockModal } from "@/components/modals/StockModal";
import type { useMasterCrud } from "@/hooks/useMasterCrud";

interface MasterModalsContainerProps {
  crud: ReturnType<typeof useMasterCrud>;
  labStock: Record<string, LabStockItem>;
  notify: (msg: string) => void;
}

export const MasterModalsContainer: React.FC<MasterModalsContainerProps> = ({
  crud,
  labStock,
  notify,
}) => {
  return (
    <>
      <UserModal
        open={crud.userModalOpen}
        onOpenChange={crud.setUserModalOpen}
        editingUser={crud.editingUser}
        setEditingUser={crud.setEditingUser}
        handleSaveUser={crud.handleSaveUser}
      />

      <ProdiModal
        open={crud.prodiModalOpen}
        onOpenChange={crud.setProdiModalOpen}
        newProdiName={crud.newProdiName}
        setNewProdiName={crud.setNewProdiName}
        handleAddProdi={crud.handleAddProdi}
      />

      <CourseModal
        open={crud.courseModalOpen}
        onOpenChange={crud.setCourseModalOpen}
        editingCourseName={crud.editingCourseName}
        adminSelectedProdi={crud.adminSelectedProdi}
        adminSelectedSem={crud.adminSelectedSem}
        courseFormName={crud.courseFormName}
        setCourseFormName={crud.setCourseFormName}
        handleSaveCourse={crud.handleSaveCourse}
      />

      <MenuModal
        open={crud.menuModalOpen}
        onOpenChange={crud.setMenuModalOpen}
        editingMenuName={crud.editingMenuName}
        kaprodiSelectedCourse={crud.kaprodiSelectedCourse}
        kaprodiSelectedSem={crud.kaprodiSelectedSem}
        kaprodiSelectedProdi={crud.kaprodiSelectedProdi}
        menuFormName={crud.menuFormName}
        setMenuFormName={crud.setMenuFormName}
        menuFormIngredients={crud.menuFormIngredients}
        setMenuFormIngredients={crud.setMenuFormIngredients}
        handleSaveMenu={crud.handleSaveMenu}
        notify={notify}
      />

      <StockModal
        open={crud.stockModalOpen}
        onOpenChange={crud.setStockModalOpen}
        editingStockItem={crud.editingStockItem}
        setEditingStockItem={crud.setEditingStockItem}
        labStock={labStock}
        handleSaveStock={crud.handleSaveStock}
      />
    </>
  );
};
