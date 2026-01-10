"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Receipt, 
  AlertCircle, 
  Settings, 
  LogOut,
  Sparkles,
  Menu,
  X,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/transactions", label: "Transacciones", icon: Receipt },
  { href: "/pending", label: "Pendientes", icon: AlertCircle },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!session) return null;

  return (
    <>
      {/* Desktop navbar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-dark-900/90 border-r border-dark-700/50 backdrop-blur-xl z-50">
        {/* Logo */}
        <div className="p-6 border-b border-dark-700/50">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ExpenseAI</h1>
              <p className="text-xs text-dark-400">Smart Tracker</p>
            </div>
          </Link>
        </div>

        {/* Nav items */}
        <div className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-dark-300 hover:text-white hover:bg-dark-800"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.href === "/pending" && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>

        {/* User section */}
        <div className="p-4 border-t border-dark-700/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <img
              src={session.user?.image || "/default-avatar.png"}
              alt="Avatar"
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session.user?.name}
              </p>
              <p className="text-xs text-dark-400 truncate">
                {session.user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full mt-2 justify-start"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </nav>

      {/* Mobile navbar */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-16 bg-dark-900/90 border-b border-dark-700/50 backdrop-blur-xl z-50 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">ExpenseAI</span>
        </Link>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-dark-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-dark-900/95 backdrop-blur-xl z-40 pt-16"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 rounded-xl transition-all",
                    isActive
                      ? "bg-primary-500/10 text-primary-400"
                      : "text-dark-300"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

