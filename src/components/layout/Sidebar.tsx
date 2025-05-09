
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Code,
  BarChart,
  Menu,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const navItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "Assessments",
    icon: FileText,
    href: "/assessments",
  },
  {
    title: "MCQ Questions",
    icon: CheckSquare,
    href: "/mcq-questions",
  },
  {
    title: "Coding Questions",
    icon: Code,
    href: "/coding-questions",
  },
  {
    title: "Results",
    icon: BarChart,
    href: "/results",
  },
  {
    title: "Users",
    icon: Users,
    href: "/users",
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const isMobile = useIsMobile();

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-sidebar z-30 transition-all duration-300 ease-in-out",
          isOpen ? "w-64" : isMobile ? "-translate-x-full" : "w-16",
          "flex flex-col"
        )}
      >
        <div className="flex items-center justify-between p-4">
          {isOpen && (
            <Link to="/" className="flex items-center">
              <span className="text-white text-xl font-bold">Yudha Admin</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-sidebar-accent"
            onClick={toggleSidebar}
          >
            <Menu size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-auto py-4">
          <nav className="space-y-2 px-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center p-3 rounded-md text-sm transition-colors",
                  location.pathname === item.href
                    ? "bg-sidebar-accent text-white"
                    : "text-gray-300 hover:text-white hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon
                  size={20}
                  className={cn("flex-shrink-0", isOpen ? "mr-3" : "mx-auto")}
                />
                {isOpen && <span>{item.title}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
