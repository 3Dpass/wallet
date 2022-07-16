export default function TitledValue({ title, value }) {
  return (
    <div>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl overflow-x-auto">{value}</div>
    </div>
  );
}
