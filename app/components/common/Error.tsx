import type { ReactNode } from "react";

export default function ErrorMessage({ children }: { children: ReactNode }) {
  return <div className="p-4 text-gray-500">{children}</div>;
}
