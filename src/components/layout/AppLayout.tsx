import ShopStatusButton from "@/components/shop/ShopStatusButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useShopStatus } from "@/hooks/useShopStatus";
import { cn } from "@/lib/utils";
import ShopClosed from "@/pages/ShopClosed";
import {
  Banknote,
  BarChart3,
  ChevronRight,
  Download,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Package,
  Receipt,
  Scissors,
  ShoppingCart,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

const navSections = [
  {
    title: "Main Menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/transaction", label: "Transaksi", icon: ShoppingCart },
      { href: "/barbers", label: "Barber", icon: Users, ownerOnly: true },
      {
        href: "/items",
        label: "Layanan & Produk",
        icon: Package,
        ownerOnly: true,
      },
      { href: "/expenses", label: "Pengeluaran", icon: Receipt },
      { href: "/withdrawals", label: "Withdraw", icon: Wallet },
      { href: "/cash-register", label: "Deposit", icon: Banknote },
      { href: "/reports", label: "Laporan", icon: BarChart3 },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { href: "/profile", label: "Profile", icon: User },
      { href: "/email-settings", label: "Email", icon: Mail, ownerOnly: true },
      { href: "/transaction-history", label: "History", icon: History },
      { href: "/install", label: "Install App", icon: Download },
    ],
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, role, signOut, isOwner } = useAuth();
  
  const { isOpen: isShopOpen, isLoading: isShopLoading } = useShopStatus();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const filteredNavItems = navSections.flatMap(section =>
    section.items.filter(item => !item.ownerOnly || isOwner)
  );

  // Show loading while checking shop status
  if (isShopLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show shop closed page if shop is not open
  if (!isShopOpen) {
    return <ShopClosed />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Scissors className="h-6 w-6 text-primary" />
          <span className="font-semibold">Space Style</span>
        </div>
        <div className="flex items-center gap-2">
          <ShopStatusButton />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card border-r z-40 transition-transform duration-300",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b">
            <div className="p-2 rounded-lg bg-primary/10">
              <Scissors className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Space Style</h1>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  {section.title}
                </p>

                <div className="space-y-1">
                  {section.items
                    .filter((item) => !item.ownerOnly || isOwner)
                    .map((item) => {
                      const isActive = location.pathname === item.href;

                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 border px-4 py-3 rounded-lg text-sm font-medium transition-all",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                          {isActive && (
                            <ChevronRight className="h-4 w-4 ml-auto" />
                          )}
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </nav>

          {/* Shop Status & User Info & Logout */}
          <div className="p-4 border-t">
            <div className="mb-3 px-4 hidden lg:block">
              <ShopStatusButton />
            </div>
            <div className="mb-3 px-4">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
