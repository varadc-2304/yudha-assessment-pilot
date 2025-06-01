import React from "react";
import { Link, useLocation } from "react-router-dom";
import { User, LayoutDashboard, FileText, CheckSquare, Code, BarChart, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

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

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 py-3 px-4 md:px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <img 
            src="/Yudha.png" 
            alt="Yudha Logo" 
            className="w-6 h-6 object-contain"
          />
          <h1 className="text-xl font-semibold text-red-600">Yudha Admin</h1>
        </div>
      </div>

      {/* Centered Navigation */}
      <div className="hidden md:flex justify-center flex-1">
        <nav className="flex space-x-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-red-100 text-red-700"
                  : "text-gray-700 hover:bg-red-50 hover:text-red-600"
              )}
            >
              <item.icon size={18} className="mr-2" />
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile navigation */}
      <NavigationMenu className="md:hidden">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent hover:bg-red-50 hover:text-red-600">
              Navigation
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[200px] gap-1 p-2">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <NavigationMenuLink asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md text-sm hover:bg-red-50 hover:text-red-600",
                          location.pathname === item.href
                            ? "bg-red-100 text-red-700 font-medium"
                            : "text-gray-700"
                        )}
                      >
                        <item.icon size={16} />
                        {item.title}
                      </Link>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative rounded-full h-9 w-9 bg-red-100 hover:bg-red-200"
            >
              <User size={18} className="text-red-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              {user?.name || user?.email || "Admin"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
