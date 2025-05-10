
import React from "react";
import Header from "./Header";
import { Toaster } from "@/components/ui/toaster";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Header />
      <main className="p-4 md:p-6">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
};

export default DashboardLayout;
