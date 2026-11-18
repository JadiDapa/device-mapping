"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon, XIcon } from "lucide-react";
import { id } from "@/lib/i18n/id";

type NavLink = { href: string; label: string };

/**
 * Header navigation. Inline from `md` up; below it the links collapse into a
 * menu button so the header never overflows on a phone.
 */
export function AppNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav
        aria-label={id.mobile.menu}
        className="hidden items-center gap-4 md:flex"
      >
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        aria-label={id.mobile.menu}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-accent focus-visible:ring-ring/50 -ml-2 flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-[3px] md:hidden"
      >
        {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
      </button>

      {open && (
        <nav
          aria-label={id.mobile.menu}
          className="bg-background absolute top-14 right-0 left-0 z-[1100] flex flex-col border-b shadow-md md:hidden"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="hover:bg-accent flex min-h-11 items-center px-4 text-sm"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
