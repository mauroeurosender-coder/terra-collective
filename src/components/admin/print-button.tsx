"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary min-h-10 py-2 text-sm">
      <Printer className="h-4 w-4" /> Print
    </button>
  );
}
