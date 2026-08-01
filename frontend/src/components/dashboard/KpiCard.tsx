type KpiCardProps = {
  title: string;
  value: string | number;
  color: string;
  icon: string;
};

function KpiCard({ title, value, color, icon }: KpiCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-md border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm text-gray-500">{title}</h3>

          <p className="mt-2 text-3xl font-bold text-slate-800">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default KpiCard;