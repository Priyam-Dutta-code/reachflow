import type { ElementType, ReactNode } from "react";

import { cn } from "./cn";

export function Container({
  as: Tag = "div",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn("container-px", className)}>{children}</Tag>;
}
