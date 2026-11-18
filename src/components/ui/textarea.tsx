import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive dark:bg-input/30 focus-visible:outline-ring flex field-sizing-content min-h-16 w-full rounded-sm border bg-transparent px-3 py-2 text-base shadow-xs transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
