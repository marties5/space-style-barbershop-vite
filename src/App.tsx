import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import { TransactionNotification } from "@/components/notifications/TransactionNotification";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transaction from "./pages/Transaction";
import Barbers from "./pages/Barbers";
import Services from "./pages/Services";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TransactionNotification />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout><Dashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/transaction" element={
              <ProtectedRoute>
                <AppLayout><Transaction /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/barbers" element={
              <ProtectedRoute requireOwner>
                <AppLayout><Barbers /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/services" element={
              <ProtectedRoute requireOwner>
                <AppLayout><Services /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute requireOwner>
                <AppLayout><Products /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <AppLayout><Reports /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
