
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { User, LayoutDashboard, FileText, CheckSquare, Code, BarChart, Users, ChevronDown } from "lucide-react";
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
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <img 
                  src="/Yudha.png" 
                  alt="Yudha Logo" 
                  className="h-6 w-6 object-contain brightness-0 invert"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Yudha Admin</h1>
                <p className="text-xs text-muted-foreground">Assessment Platform</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex flex-1 justify-center">
            <nav className="flex items-center space-x-1 rounded-xl bg-muted/30 p-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    location.pathname === item.href
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  )}
                >
                  <item.icon size={16} />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Mobile Navigation */}
          <NavigationMenu className="lg:hidden">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted/50">
                  <span className="flex items-center space-x-2">
                    <span>Menu</span>
                    <ChevronDown size={16} />
                  </span>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[300px] gap-2 p-4">
                    {navItems.map((item) => (
                      <NavigationMenuLink key={item.href} asChild>
                        <Link
                          to={item.href}
                          className={cn(
                            "flex items-center space-x-3 rounded-lg p-3 text-sm transition-colors",
                            location.pathname === item.href
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <item.icon size={18} />
                          <span>{item.title}</span>
                        </Link>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          
          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 rounded-xl px-3 py-2 hover:bg-muted/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    <User size={16} />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{user?.name || "Admin"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <ChevronDown size={16} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name || "Admin"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
