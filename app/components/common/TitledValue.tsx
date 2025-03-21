import type React from "react";

interface TitledValueProps {
  title: string | React.ReactNode;
  value: string | React.ReactNode;
  fontMono?: boolean;
  fontSmall?: boolean;
}

export default function TitledValue({
  title,
  value,
  fontMono = false,
  fontSmall = false,
  ...attrs
}: TitledValueProps) {
  let valueClassName = "";
  if (fontMono) {
    valueClassName += " font-mono";
  }
  if (fontSmall) {
    valueClassName += " text-sm";
  } else {
    valueClassName += " text-lg";
  }

  return (
    <div {...attrs}>
      <div className="small-title">{title}</div>
      <div className={valueClassName}>{value}</div>
    </div>
  );
}
