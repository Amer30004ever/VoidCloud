"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeHref?: string;
}

export function Breadcrumb({ items, homeHref = "/voidcloud/dashboard" }: BreadcrumbProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href={homeHref} className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {isLast || !item.href ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
