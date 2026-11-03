"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      className="btn-secondary print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="mr-1.5 h-4 w-4" aria-hidden />
      Cetak / simpan PDF
    </button>
  );
}
