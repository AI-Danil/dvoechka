import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import RequireRole from "@/components/RequireRole";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Admin from "./pages/Admin.tsx";
import Replay from "./pages/Replay.tsx";
import AuthPage from "./pages/Auth.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import TeacherDashboard from "./pages/TeacherDashboard.tsx";
import StudentDashboard from "./pages/StudentDashboard.tsx";
import Account from "./pages/Account.tsx";
import TeacherLive from "./pages/TeacherLive.tsx";
import LiveStudent from "./pages/LiveStudent.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route
              path="/teacher/dashboard"
              element={<RequireRole role="teacher"><TeacherDashboard /></RequireRole>}
            />
            <Route
              path="/teacher/live"
              element={<RequireRole role={["teacher", "admin"]}><TeacherLive /></RequireRole>}
            />
            <Route path="/live" element={<LiveStudent />} />
            <Route
              path="/student/dashboard"
              element={<RequireRole role="student"><StudentDashboard /></RequireRole>}
            />
            <Route path="/replay/:id" element={<Replay />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
