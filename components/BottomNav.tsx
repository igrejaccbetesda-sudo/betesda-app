"use client";

import { Home, PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/consulta", label: "Explorar", icon: Search },
  { href: "/cadastro", label: "Cadastrar", icon: PlusCircle },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E8E2D6] bg-[#FFFFFF] md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3">
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? "text-[#C9A64A]" : "text-[#77736A]"
              }`}
            >
              <Icon size={21} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
