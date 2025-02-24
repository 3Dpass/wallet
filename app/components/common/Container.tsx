import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>{children}</div>
  );
}
