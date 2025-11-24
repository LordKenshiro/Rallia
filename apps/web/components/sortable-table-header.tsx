"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableTableHeaderProps {
  field: string;
  children: React.ReactNode;
  currentSortBy?: string | null;
  currentSortOrder?: "asc" | "desc";
}

export function SortableTableHeader({
  field,
  children,
  currentSortBy,
  currentSortOrder,
}: SortableTableHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    const newOrder =
      currentSortBy === field && currentSortOrder === "asc" ? "desc" : "asc";
    
    current.set("sortBy", field);
    current.set("sortOrder", newOrder);
    current.delete("page"); // Reset to page 1 when sorting
    
    router.push(`?${current.toString()}`);
  };

  const isActive = currentSortBy === field;
  const Icon = isActive
    ? currentSortOrder === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <th className="text-left px-3 py-2 text-sm font-semibold">
      <button
        onClick={handleSort}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        <Icon className={cn("h-3 w-3", isActive && "text-foreground")} />
      </button>
    </th>
  );
}

