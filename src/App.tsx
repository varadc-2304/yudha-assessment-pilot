
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
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import CreateAssessment from "./pages/CreateAssessment";
import NotFound from "./pages/NotFound";
import CreateMCQForm from "./components/mcq/CreateMCQForm";
import CreateCodingForm from "./components/coding/CreateCodingForm";

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
        <Routes>
          <Route path="/" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/assessments" element={<DashboardLayout><Assessments /></DashboardLayout>} />
          <Route path="/create-assessment" element={<DashboardLayout><CreateAssessment /></DashboardLayout>} />
          <Route path="/assessments/:id" element={<DashboardLayout><Assessments /></DashboardLayout>} />
          <Route path="/assessments/:id/edit" element={<DashboardLayout><Assessments /></DashboardLayout>} />
          <Route path="/mcq-questions" element={<DashboardLayout><MCQQuestions /></DashboardLayout>} />
          <Route path="/create-mcq-question" element={<DashboardLayout><CreateMCQForm /></DashboardLayout>} />
          <Route path="/coding-questions" element={<DashboardLayout><CodingQuestions /></DashboardLayout>} />
          <Route path="/create-coding-question" element={<DashboardLayout><CreateCodingForm /></DashboardLayout>} />
          <Route path="/results" element={<DashboardLayout><Results /></DashboardLayout>} />
          <Route path="/results/:assessmentId" element={<DashboardLayout><Results /></DashboardLayout>} />
          <Route path="/users" element={<DashboardLayout><Users /></DashboardLayout>} />
          <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
