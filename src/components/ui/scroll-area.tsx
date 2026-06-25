import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

// Lightweight, dependency-free stand-in for the shadcn ScrollArea. Uses native
// overflow scrolling, which is all the Kanban columns need.
function ScrollArea({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("relative overflow-y-auto", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { ScrollArea };
