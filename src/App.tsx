
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Assessments from "./pages/Assessments";
import MCQQuestions from "./pages/MCQQuestions";
import CodingQuestions from "./pages/CodingQuestions";
import Results from "./pages/Results";
import Settings from "./pages/Settings";
import CreateAssessment from "./pages/CreateAssessment";
import NotFound from "./pages/NotFound";
import CreateMCQForm from "./components/mcq/CreateMCQForm";
import CreateCodingForm from "./components/coding/CreateCodingForm";
import Login from "./pages/Login";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/assessments" element={<ProtectedRoute><DashboardLayout><Assessments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/create-assessment" element={<ProtectedRoute><DashboardLayout><CreateAssessment /></DashboardLayout></ProtectedRoute>} />
            <Route path="/assessments/:id" element={<ProtectedRoute><DashboardLayout><Assessments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/assessments/:id/edit" element={<ProtectedRoute><DashboardLayout><Assessments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/mcq-questions" element={<ProtectedRoute><DashboardLayout><MCQQuestions /></DashboardLayout></ProtectedRoute>} />
            <Route path="/create-mcq-question" element={<ProtectedRoute><DashboardLayout><CreateMCQForm /></DashboardLayout></ProtectedRoute>} />
            <Route path="/coding-questions" element={<ProtectedRoute><DashboardLayout><CodingQuestions /></DashboardLayout></ProtectedRoute>} />
            <Route path="/create-coding-question" element={<ProtectedRoute><DashboardLayout><CreateCodingForm /></DashboardLayout></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><DashboardLayout><Results /></DashboardLayout></ProtectedRoute>} />
            <Route path="/results/:assessmentId" element={<ProtectedRoute><DashboardLayout><Results /></DashboardLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
