import React from "react";

interface TokenHoldersPieChartProps {
  holders: { accountId: string; balance: number }[];
  total: number;
  symbol: string;
}

const COLORS = [
  "#4F8AFA", "#A259F7", "#F76E9A", "#F7C46E", "#6EF7B1",
  "#F76E6E", "#6E9AF7", "#B1F76E", "#F7A26E", "#6EF7F7"
];

export default function TokenHoldersPieChart({ holders, total, symbol }: TokenHoldersPieChartProps) {
  if (!holders.length || total === 0) {
    return <div className="text-center text-gray-500 py-4">No distribution data</div>;
  }
  // Top 10 holders, rest as 'Other'
  const sorted = [...holders].sort((a, b) => b.balance - a.balance);
  const top = sorted.slice(0, 10);
  const rest = sorted.slice(10);
  const restTotal = rest.reduce((sum, h) => sum + h.balance, 0);
  const pieData = [...top, ...(restTotal > 0 ? [{ accountId: 'Other', balance: restTotal }] : [])];
  // Pie chart geometry
  const size = 120, radius = 54, cx = 60, cy = 60;
  let acc = 0;
  const slices = pieData.map((h, i) => {
    const value = h.balance / total;
    const startAngle = acc * 2 * Math.PI;
    acc += value;
    const endAngle = acc * 2 * Math.PI;
    const x1 = cx + radius * Math.sin(startAngle);
    const y1 = cy - radius * Math.cos(startAngle);
    const x2 = cx + radius * Math.sin(endAngle);
    const y2 = cy - radius * Math.cos(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const path = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
    return (
      <path key={h.accountId} d={path} fill={COLORS[i % COLORS.length]} stroke="#222" strokeWidth={1} />
    );
  });
  return (
    <div className="flex flex-col items-center py-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices}
      </svg>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {pieData.map((h, i) => (
          <div key={h.accountId} className="flex items-center gap-1 text-xs">
            <span style={{ background: COLORS[i % COLORS.length], width: 12, height: 12, display: 'inline-block', borderRadius: 2 }} />
            <span>{h.accountId === 'Other' ? 'Other' : h.accountId.slice(0, 6) + '…'}</span>
            <span className="font-mono">{((h.balance / total) * 100).toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
} 