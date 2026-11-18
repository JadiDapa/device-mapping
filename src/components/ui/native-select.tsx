import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Styled native <select>: accessible and touch-friendly (the OS picker on
 * phones) without a Radix popover over the Leaflet map.
 */
function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        data-slot="native-select"
        className={cn(
          "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full appearance-none rounded-md border bg-transparent px-3 pr-8 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export { NativeSelect };
