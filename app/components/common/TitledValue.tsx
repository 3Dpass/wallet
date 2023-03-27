import React from "react";

interface TitledValueProps {
  title: string;
  // value is string or ReactNode
  value: string | React.ReactNode;
  fontMono?: boolean;
  fontSmall?: boolean;
}

export default function TitledValue({ title, value, fontMono = false, fontSmall = false, ...attrs }: TitledValueProps) {
  let valueClassName = "text-lg truncate";
  if (fontMono) {
    valueClassName += " font-mono";
  }
  if (fontSmall) {
    valueClassName += " text-sm";
  }

  return (
    <div {...attrs}>
      <div className="small-title">{title}</div>
      <div className={valueClassName}>{value}</div>
    </div>
  );
}
