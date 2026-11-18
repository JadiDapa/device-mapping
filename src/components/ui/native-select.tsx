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
          "border-input dark:bg-input/30 focus-visible:border-ring aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive focus-visible:outline-ring h-9 w-full appearance-none rounded-sm border bg-transparent px-3 pr-8 text-sm shadow-xs outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-md:h-11",
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
