"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export default function ResponsiveFacetDetails({
  className,
  number,
  children,
}: {
  className: string;
  number: string;
  children: ReactNode;
}) {
  // Match the server-rendered desktop state during hydration. Mobile CSS hides
  // the pending body immediately; the effect then commits the semantic state.
  const [open, setOpen] = useState(true);
  const [responsivePending, setResponsivePending] = useState(true);

  useEffect(() => {
    setOpen(!window.matchMedia("(max-width: 680px)").matches);
    setResponsivePending(false);
  }, []);

  return (
    <details
      className={className}
      open={open}
      data-facet-number={number}
      data-responsive-pending={responsivePending ? "true" : undefined}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      {children}
    </details>
  );
}
