export default function TitledValue({ title, value, fontMono = false, fontSmall = false, ...attrs }) {
  let valueClassName = "text-xl overflow-x-auto";
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
