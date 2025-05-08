
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Assessments from "./pages/Assessments";
import CreateAssessment from "./pages/CreateAssessment";
import MCQQuestions from "./pages/MCQQuestions";
import CodingQuestions from "./pages/CodingQuestions";
import Results from "./pages/Results";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/assessments" element={<DashboardLayout><Assessments /></DashboardLayout>} />
          <Route path="/create-assessment" element={<DashboardLayout><CreateAssessment /></DashboardLayout>} />
          <Route path="/assessments/:id" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/assessments/:id/edit" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/mcq-questions" element={<DashboardLayout><MCQQuestions /></DashboardLayout>} />
          <Route path="/coding-questions" element={<DashboardLayout><CodingQuestions /></DashboardLayout>} />
          <Route path="/results" element={<DashboardLayout><Results /></DashboardLayout>} />
          <Route path="/results/:assessmentId" element={<DashboardLayout><Results /></DashboardLayout>} />
          <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
