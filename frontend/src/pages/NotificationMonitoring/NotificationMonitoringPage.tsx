import { useEffect, useState } from "react";
import MainLayout from "../../components/layout/MainLayout";
import {
  NOTIFICATION_CONDITIONS,
  NOTIFICATION_RUN_STATUSES,
  type NotificationMonitoringData,
  type NotificationMonitoringFilters,
} from "../../models/notificationMonitoring";
import { getNotificationMonitoring } from "../../services/notificationMonitoringService";

const EMPTY_DATA: NotificationMonitoringData = { runs: [], attempts: [] };

function label(value: string): string {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: string): string {
  if (status === "SUCCEEDED") return "bg-emerald-100 text-emerald-800";
  if (status === "RUNNING") return "bg-blue-100 text-blue-800";
  if (status === "PARTIAL_FAILED") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function NotificationMonitoringPage() {
  const [data, setData] = useState<NotificationMonitoringData>(EMPTY_DATA);
  const [filters, setFilters] = useState<NotificationMonitoringFilters>({
    status: "ALL",
    condition: "ALL",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const result = await getNotificationMonitoring(appliedFilters);
        if (!cancelled) setData(result);
      } catch (error) {
        console.error(error);
        if (!cancelled) setErrorMessage("Cannot load notification monitoring data. Please try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [appliedFilters]);

  const succeededRuns = data.runs.filter((run) => run.status === "SUCCEEDED").length;
  const sent = data.attempts.filter((attempt) => attempt.success).length;
  const failed = data.attempts.length - sent;

  return (
    <MainLayout>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Notification Monitoring</h2>
            <p className="mt-2 text-gray-600">LINE notification runs and delivery audit</p>
          </div>
          <button
            type="button"
            onClick={() => setAppliedFilters({ ...filters })}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        <form
          className="mt-6 grid gap-4 rounded-xl bg-white p-5 shadow md:grid-cols-5"
          onSubmit={(event) => { event.preventDefault(); setAppliedFilters({ ...filters }); }}
        >
          <label className="text-sm font-medium text-slate-700">From
            <input type="date" value={filters.dateFrom ?? ""} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">To
            <input type="date" value={filters.dateTo ?? ""} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 p-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">Run status
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as NotificationMonitoringFilters["status"] })} className="mt-1 block w-full rounded-lg border border-slate-300 p-2">
              <option value="ALL">All statuses</option>
              {NOTIFICATION_RUN_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Condition
            <select value={filters.condition} onChange={(event) => setFilters({ ...filters, condition: event.target.value as NotificationMonitoringFilters["condition"] })} className="mt-1 block w-full rounded-lg border border-slate-300 p-2">
              <option value="ALL">All conditions</option>
              {NOTIFICATION_CONDITIONS.map((condition) => <option key={condition} value={condition}>{label(condition)}</option>)}
            </select>
          </label>
          <button type="submit" className="self-end rounded-lg bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700">Apply filters</button>
        </form>

        {isLoading ? (
          <div className="mt-6 rounded-xl bg-white p-8 text-center text-gray-500 shadow">Loading notification audit...</div>
        ) : errorMessage ? (
          <div className="mt-6 rounded-xl bg-white p-8 text-center text-red-600 shadow" role="alert">{errorMessage}</div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {[['Runs', data.runs.length, 'bg-slate-700'], ['Successful runs', succeededRuns, 'bg-emerald-600'], ['Deliveries sent', sent, 'bg-blue-600'], ['Deliveries failed', failed, 'bg-red-600']].map(([title, value, color]) => (
                <div key={String(title)} className={`${color} rounded-xl p-5 text-white shadow`}><p className="text-sm opacity-80">{title}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>
              ))}
            </div>

            <section className="mt-6 overflow-hidden rounded-xl bg-white shadow">
              <h3 className="border-b p-5 text-lg font-semibold text-slate-800">Recent runs</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="p-3">Started</th><th className="p-3">Status</th><th className="p-3">Scanned</th><th className="p-3">Claimed</th><th className="p-3">Sent</th><th className="p-3">Failed</th><th className="p-3">Error</th></tr></thead>
                  <tbody className="divide-y">
                    {data.runs.map((run) => <tr key={run.id}><td className="whitespace-nowrap p-3">{formatDate(run.started_at)}</td><td className="p-3"><span className={`${statusClass(run.status)} rounded-full px-2 py-1 text-xs font-semibold`}>{label(run.status)}</span></td><td className="p-3">{run.products_scanned}</td><td className="p-3">{run.notifications_claimed}</td><td className="p-3">{run.notifications_sent}</td><td className="p-3">{run.notifications_failed}</td><td className="max-w-sm p-3 text-red-700">{run.error ?? "—"}</td></tr>)}
                    {data.runs.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">No notification runs match these filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-xl bg-white shadow">
              <h3 className="border-b p-5 text-lg font-semibold text-slate-800">Delivery attempts</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="p-3">Attempted</th><th className="p-3">Product</th><th className="p-3">Condition</th><th className="p-3">Result</th><th className="p-3">Error</th></tr></thead>
                  <tbody className="divide-y">
                    {data.attempts.map((attempt) => <tr key={attempt.id}><td className="whitespace-nowrap p-3">{formatDate(attempt.attempted_at)}</td><td className="p-3"><p className="font-medium text-slate-800">{attempt.product_code}</p><p className="text-gray-500">{attempt.product_name}</p></td><td className="p-3">{label(attempt.condition)}</td><td className="p-3"><span className={`${attempt.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'} rounded-full px-2 py-1 text-xs font-semibold`}>{attempt.success ? 'SENT' : 'FAILED'}</span></td><td className="max-w-sm p-3 text-red-700">{attempt.error ?? "—"}</td></tr>)}
                    {data.attempts.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No delivery attempts match these filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default NotificationMonitoringPage;
