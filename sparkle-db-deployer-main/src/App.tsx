import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import CreateJob from "./pages/CreateJob";
import JobDetails from "./pages/JobDetails";
import AdminServers from "./pages/AdminServers";
import AdminDatabases from "./pages/AdminDatabases";
import NotFound from "./pages/NotFound";
import { AuthGate } from "@/auth/AuthGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthGate>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/jobs/new"
              element={
                <AppLayout>
                  <CreateJob />
                </AppLayout>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <AppLayout>
                  <JobDetails />
                </AppLayout>
              }
            />
            <Route
              path="/admin/servers"
              element={
                <AppLayout>
                  <AdminServers />
                </AppLayout>
              }
            />
            <Route
              path="/admin/databases"
              element={
                <AppLayout>
                  <AdminDatabases />
                </AppLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
