interface ReviewStatsProps {
  label: string;
  value: number;
  badge?: {
    text: string;
    type: "new" | "extend";
  };
  icon?: React.ReactNode;
}

export function ReviewStats({ label, value, badge, icon }: ReviewStatsProps) {
  return (
    <div className="stat-card bg-card border border-border p-6 rounded-2xl transition-all hover:translate-y-[-4px] hover:shadow-xl">
      {badge && (
        <div
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
            badge.type === "new"
              ? "bg-chart-2 text-white"
              : "bg-chart-4 text-white"
          }`}
        >
          {badge.text}
        </div>
      )}
      {icon && (
        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center">
          {icon}
        </div>
      )}
      {!badge && !icon && (
        <div className="text-xs mb-3 text-muted-foreground">{label}</div>
      )}
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

