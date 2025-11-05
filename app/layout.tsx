import type { Metadata } from "next";
import "./globals.css";
import { Home, Package, Users, FileText, ShoppingCart, PackageCheck, CreditCard, ChefHat, ShoppingBag, BookOpen, TrendingUp, Activity } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kadha Cafe - Inventory Management",
  description: "Inventory management system for Kadha Cafe",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Kadha Cafe - Inventory
              </h1>
            </div>
          </header>

          {/* Main Layout */}
          <div className="flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-sm min-h-screen border-r">
              <nav className="p-4 space-y-2">
                <Link
                  href="/"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/ingredients"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Package className="w-5 h-5" />
                  <span>Ingredients</span>
                </Link>
                <Link
                  href="/recipes"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChefHat className="w-5 h-5" />
                  <span>Recipes</span>
                </Link>
                <Link
                  href="/vendors"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Users className="w-5 h-5" />
                  <span>Vendors</span>
                </Link>
                <Link
                  href="/intends"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  <span>Intends</span>
                </Link>
                <Link
                  href="/sales"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Sales & Production</span>
                </Link>
                <Link
                  href="/purchase-orders"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Purchase Orders</span>
                </Link>
                <Link
                  href="/stock"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  <PackageCheck className="w-5 h-5" />
                  <span>Stock</span>
                </Link>
                <Link
                  href="/payments"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Payments</span>
                </Link>
                <Link
                  href="/cash-ledger"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Cash Ledger</span>
                </Link>
                <Link
                  href="/mtd-cogs"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span>MTD COGS</span>
                </Link>
                <Link
                  href="/ingredient-movement"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Activity className="w-5 h-5" />
                  <span>Ingredient Movement</span>
                </Link>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
