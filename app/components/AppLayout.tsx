'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Home, Package, Users, FileText, ShoppingCart, PackageCheck, CreditCard, ChefHat, ShoppingBag, BookOpen, TrendingUp, Activity, User, Menu, X } from "lucide-react";
import Link from "next/link";
import { ProtectedRoute } from "./ProtectedRoute";
import { LogoutButton } from "./LogoutButton";
import { useUserRole } from "@/lib/usePermissions";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { username, role } = useUserRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Don't show layout for login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Hide certain navigation items for staff users
  const isStaff = role === 'staff';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                Kadha Cafe - Inventory
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {username && (
                <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 rounded-lg">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="truncate max-w-[100px] sm:max-w-none">{username}</span>
                </div>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex relative">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed top-0 left-0 z-50 h-screen w-64 sm:w-64 bg-white shadow-lg border-r transform transition-transform duration-300 ease-in-out
            lg:relative lg:translate-x-0 lg:z-auto lg:h-auto lg:min-h-screen
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-3 sm:p-4 space-y-1 sm:space-y-2 h-full overflow-y-auto">
            {/* Mobile sidebar header */}
            <div className="lg:hidden flex items-center justify-between mb-4 pb-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {!isStaff && (
              <Link
                href="/"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Dashboard</span>
              </Link>
            )}
            <Link
              href="/ingredients"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Package className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Ingredients</span>
            </Link>
            <Link
              href="/recipes"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Recipes</span>
            </Link>
            {!isStaff && (
              <Link
                href="/vendors"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Vendors</span>
              </Link>
            )}
            <Link
              href="/intends"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Intends</span>
            </Link>
            {!isStaff && (
              <Link
                href="/sales"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Sales & Production</span>
              </Link>
            )}
            {!isStaff && (
              <Link
                href="/purchase-orders"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Purchase Orders</span>
              </Link>
            )}
            <Link
              href="/stock"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Stock</span>
            </Link>
            {!isStaff && (
              <Link
                href="/payments"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Payments</span>
              </Link>
            )}
            {!isStaff && (
              <Link
                href="/cash-ledger"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Cash Ledger</span>
              </Link>
            )}
            {!isStaff && (
              <Link
                href="/mtd-cogs"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>MTD COGS</span>
              </Link>
            )}
            <Link
              href="/ingredient-movement"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Ingredient Movement</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full lg:w-auto min-w-0 max-w-full overflow-x-hidden p-3 sm:p-4 lg:p-6 xl:p-8">
          <div className="w-full max-w-full">
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          </div>
        </main>
      </div>
    </div>
  );
}

