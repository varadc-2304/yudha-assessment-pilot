
import React from "react";
import Header from "./Header";
import { Toaster } from "@/components/ui/toaster";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      <main className="page-container">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
};

export default DashboardLayout;
