export default function TitledValue({ title, value, fontMono = false, ...attrs }) {
  let valueClassName = "text-xl overflow-x-auto";
  if (fontMono) {
    valueClassName += " font-mono";
  }

  return (
    <div {...attrs}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className={valueClassName}>{value}</div>
    </div>
  );
}
