import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ShopStatusProvider } from "@/hooks/useShopStatus";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transaction from "./pages/Transaction";
import Barbers from "./pages/Barbers";
import ItemsManagement from "./pages/ItemsManagement";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import Withdrawals from "./pages/Withdrawals";
import CashRegister from "./pages/CashRegister";
import Profile from "./pages/Profile";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ShopStatusProvider>
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
              <Route path="/items" element={
                <ProtectedRoute requireOwner>
                  <AppLayout><ItemsManagement /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/expenses" element={
                <ProtectedRoute>
                  <AppLayout><Expenses /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/withdrawals" element={
                <ProtectedRoute>
                  <AppLayout><Withdrawals /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/cash-register" element={
                <ProtectedRoute>
                  <AppLayout><CashRegister /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <AppLayout><Reports /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <AppLayout><Profile /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/install" element={<Install />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ShopStatusProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
