"use client";

import { ModeToggle } from "@/components/mode-toggle";

export function AuthHeader() {
  return (
    <div className="absolute top-4 right-4">
      <ModeToggle />
    </div>
  );
}


