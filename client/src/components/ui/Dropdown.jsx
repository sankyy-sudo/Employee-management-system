import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Button from "./Button";

export default function Dropdown({ label, items = [], align = "right" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {label}
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      {open && (
        <div className={`absolute top-full z-30 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-1 shadow-lift dark:border-slate-800 dark:bg-slate-900 ${align === "right" ? "right-0" : "left-0"}`}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {item.icon && <item.icon size={16} aria-hidden="true" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
