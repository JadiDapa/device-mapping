import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Keadaan kosong: ikon teal di dalam lingkaran lime, judul, deskripsi, dan
 * slot aksi opsional.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center gap-3 px-4 py-10 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          aria-hidden
          className="bg-primary text-secondary flex size-14 items-center justify-center rounded-full [&_svg:not([class*='size-'])]:size-6"
        >
          {icon}
        </div>
      )}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-base font-semibold">{title}</p>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export { EmptyState };
