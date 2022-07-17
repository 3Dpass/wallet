export default function TitledValue({ title, value, fontMono = false }) {
  let valueClassName = "text-xl overflow-x-auto";
  if (fontMono) {
    valueClassName += " font-mono";
  }

  return (
    <div>
      <div className="text-sm text-gray-500">{title}</div>
      <div className={valueClassName}>{value}</div>
    </div>
  );
}
