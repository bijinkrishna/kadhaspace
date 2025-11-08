'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Users, FileText, Menu, X, ShoppingBag, BookOpen, TrendingUp, Activity, Receipt } from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Ingredients', href: '/ingredients', icon: Package },
  { name: 'Vendors', href: '/vendors', icon: Users },
  { name: 'Intends', href: '/intends', icon: FileText },
  { name: 'Sales & Production', href: '/sales', icon: ShoppingBag, description: 'Track sales and production' },
  { name: 'Cash Ledger', href: '/cash-ledger', icon: BookOpen, description: 'Track all revenue and expenditure' },
  { name: 'Other Expenses', href: '/expenses', icon: Receipt, description: 'Manage other business expenses' },
  { name: 'MTD COGS', href: '/mtd-cogs', icon: TrendingUp, description: 'Month-to-date cost analysis' },
  { name: 'Ingredient Movement', href: '/ingredient-movement', icon: Activity, description: 'Analyze ingredient consumption and movement patterns' },
];

export function Navigation() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="lg:hidden fixed top-5 left-5 z-50 p-2.5 rounded-lg text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900 transition-colors duration-200"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
        aria-expanded={sidebarOpen}
      >
        <span className="sr-only">Toggle menu</span>
        <div className="relative w-5 h-5">
          <Menu 
            className={`absolute top-0 left-0 h-5 w-5 transition-all duration-300 ${sidebarOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'}`}
          />
          <X 
            className={`absolute top-0 left-0 h-5 w-5 transition-all duration-300 ${sidebarOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`}
          />
        </div>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-56 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-900
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="h-full flex flex-col">
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150
                    ${
                      isActive
                        ? 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}

