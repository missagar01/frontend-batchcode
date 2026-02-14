import { useSidebar } from "../context/SidebarContext";

const Backdrop: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  if (!isMobileOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[990] bg-gray-900/50 backdrop-blur-sm xl:hidden"
      onClick={toggleMobileSidebar}
    />
  );
};

export default Backdrop;
