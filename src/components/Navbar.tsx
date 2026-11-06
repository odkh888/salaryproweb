"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  Tags,
  Plus,
  WalletCards,
  Landmark,
  CalendarClock,
} from "lucide-react";
import { TransactionModal } from "./TransactionModal";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Дашборд", icon: LayoutDashboard },
    { href: "/transactions", label: "Операции", icon: ReceiptText },
    { href: "/accounts", label: "Счета", icon: Landmark },
    { href: "/subscriptions", label: "Подписки", icon: CalendarClock },
    { href: "/categories", label: "Категории", icon: Tags },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
                <WalletCards size={22} />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-white">
                  Money<span className="text-blue-600 dark:text-blue-400">Flow</span>
                </span>
                <span className="block text-[10px] text-zinc-600 dark:text-zinc-300 font-medium -mt-1">
                  Учёт трат & аналитика
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Новая операция</span>
              <span className="sm:hidden">Запись</span>
            </button>
          </div>
        </div>

        {/* Mobile Subnav */}
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800/60 px-4 py-2 flex items-center justify-around bg-zinc-50/50 dark:bg-zinc-900/50">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
