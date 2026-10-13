import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { toast } from "react-toastify";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ShieldAlert,
  Users,
  TrendingUp,
} from "lucide-react";
import API from "../../api/axios";

const GREEN = "#16a34a";
const GREEN_DARK = "#15803d";
const GREEN_LIGHT = "#86efac";
const GREEN_PALE = "#dcfce7";

const emptyOverview = {
  total_open_incidents: 0,
  total_resolved_incidents: 0,
  total_critical_incidents: 0,
  total_breached_slas: 0,
  sla_compliance_percentage: 0,
  average_first_response_minutes: 0,
  average_resolution_minutes: 0,
};

function formatMinutes(value) {
  const minutes = Number(value ?? 0);

  if (!Number.isFinite(minutes) || minutes < 0) {
    return "0 min";
  }

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);

    return remainingMinutes
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  return `${Math.round(minutes)} min`;
}

function formatPercentage(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : "0.0%";
}

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-green-800">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold text-green-950">
            {value}
          </p>
          <p className="mt-2 text-xs text-green-700">{description}</p>
        </div>

        <div className="rounded-lg bg-green-100 p-3">
          <Icon size={22} className="text-green-700" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children, className = "" }) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-green-100 bg-white p-5 shadow-sm ${className}`}
    >
      <h2 className="mb-5 text-lg font-semibold text-green-950">{title}</h2>
      {children}
    </section>
  );
}

function EmptyChart({ message = "No data available" }) {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-lg bg-green-50 px-4 text-center text-sm text-green-700">
      {message}
    </div>
  );
}

export default function Analytics() {
  const [overview, setOverview] = useState(emptyOverview);
  const [agentPerformance, setAgentPerformance] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const [period, setPeriod] = useState("daily");
  const [days, setDays] = useState("7");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalytics = async (showToast = false) => {
    setRefreshing(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        API.get("/analytics/overview"),
        API.get("/analytics/agent-performance"),
        API.get("/analytics/by-priority"),
        API.get("/analytics/by-category"),
        API.get("/analytics/trends", {
          params: {
            period,
            days: Number(days),
          },
        }),
      ]);

      const [
        overviewResult,
        agentResult,
        priorityResult,
        categoryResult,
        trendResult,
      ] = results;

      let failedCount = 0;

      if (overviewResult.status === "fulfilled") {
        setOverview({
          ...emptyOverview,
          ...overviewResult.value.data,
        });
      } else {
        failedCount += 1;
      }

      if (agentResult.status === "fulfilled") {
        setAgentPerformance(
          Array.isArray(agentResult.value.data)
            ? agentResult.value.data
            : []
        );
      } else {
        failedCount += 1;
      }

      if (priorityResult.status === "fulfilled") {
        setPriorityData(
          Array.isArray(priorityResult.value.data)
            ? priorityResult.value.data
            : []
        );
      } else {
        failedCount += 1;
      }

      if (categoryResult.status === "fulfilled") {
        setCategoryData(
          Array.isArray(categoryResult.value.data)
            ? categoryResult.value.data
            : []
        );
      } else {
        failedCount += 1;
      }

      if (trendResult.status === "fulfilled") {
        const response = trendResult.value.data;
        setTrendData(Array.isArray(response?.data) ? response.data : []);
      } else {
        failedCount += 1;
      }

      if (failedCount === results.length) {
        setError("Analytics data could not be loaded. Check your backend and permissions.");
        toast.error("Unable to load analytics.");
      } else if (failedCount > 0) {
        toast.warning(
          `${failedCount} analytics request(s) failed. Some sections may be empty.`
        );
      } else if (showToast) {
        toast.success("Analytics refreshed successfully.");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load analytics."
      );
      toast.error(
        err.response?.data?.detail || "Unable to load analytics."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, days]);

  const numberValue = (value) => {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number.toLocaleString() : "0";
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-green-700">
        <RefreshCw size={22} className="animate-spin" />
        <span className="font-medium">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50/50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-950 sm:text-3xl">
              Analytics & Reports
            </h1>
            <p className="mt-2 text-sm text-green-700">
              Monitor incident volume, SLA compliance, and support team performance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 font-medium text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-white p-4 text-green-800">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Analytics unavailable</p>
              <p className="mt-1 text-sm">{error}</p>
              <p className="mt-2 text-sm">
                Check that the FastAPI server is running and that your account
                has ADMIN or MANAGER permissions.
              </p>
            </div>
          </div>
        )}

        {/* Overview cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Open Incidents"
            value={numberValue(overview.total_open_incidents)}
            description="Incidents not yet resolved"
            icon={AlertCircle}
          />

          <StatCard
            title="Resolved Incidents"
            value={numberValue(overview.total_resolved_incidents)}
            description="Total resolved incidents"
            icon={CheckCircle}
          />

          <StatCard
            title="Critical Incidents"
            value={numberValue(overview.total_critical_incidents)}
            description="Incidents marked critical"
            icon={ShieldAlert}
          />

          <StatCard
            title="SLA Breaches"
            value={numberValue(overview.total_breached_slas)}
            description="Incidents with breached SLAs"
            icon={Clock}
          />
        </div>

        {/* SLA and response metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="SLA Compliance"
            value={formatPercentage(overview.sla_compliance_percentage)}
            description="Reported SLA compliance"
            icon={TrendingUp}
          />

          <StatCard
            title="Average First Response"
            value={formatMinutes(overview.average_first_response_minutes)}
            description="Average time to first response"
            icon={Clock}
          />

          <StatCard
            title="Average Resolution"
            value={formatMinutes(overview.average_resolution_minutes)}
            description="Average time to resolve incidents"
            icon={CheckCircle}
          />
        </div>

        {/* Trend chart */}
        <SectionCard title="Incident Trends">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-green-700">
              Compare created, resolved, and open incidents.
            </p>

            <div className="flex flex-wrap gap-3">
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>

              <select
                value={days}
                onChange={(event) => setDays(event.target.value)}
                className="rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 180 days</option>
                <option value="365">Last 365 days</option>
              </select>
            </div>
          </div>

          {trendData.length === 0 ? (
            <EmptyChart message="No incident trend data for this period." />
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 10, right: 15, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GREEN_PALE} />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: GREEN_DARK, fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: GREEN_DARK, fontSize: 12 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_incidents"
                    name="Total Incidents"
                    stroke={GREEN_DARK}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved_incidents"
                    name="Resolved"
                    stroke={GREEN}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="open_incidents"
                    name="Open"
                    stroke={GREEN_LIGHT}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {/* Priority and category */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard title="Incidents by Priority">
            {priorityData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={priorityData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GREEN_PALE} />
                    <XAxis
                      dataKey="priority"
                      tick={{ fill: GREEN_DARK, fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: GREEN_DARK, fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="total"
                      name="Incidents"
                      fill={GREEN}
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Incidents by Category">
            {categoryData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="45%"
                      outerRadius={90}
                      label
                    >
                      {categoryData.map((item, index) => (
                        <Cell
                          key={`${item.category}-${index}`}
                          fill={
                            [
                              GREEN_DARK,
                              GREEN,
                              "#4ade80",
                              GREEN_LIGHT,
                              "#bbf7d0",
                            ][index % 5]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Agent performance */}
        <SectionCard title="Support Agent Performance">
          {agentPerformance.length === 0 ? (
            <EmptyChart message="No support agent performance data available." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-green-200 bg-green-50">
                    <th className="px-4 py-3 font-semibold text-green-950">
                      Agent
                    </th>
                    <th className="px-4 py-3 font-semibold text-green-950">
                      Assigned
                    </th>
                    <th className="px-4 py-3 font-semibold text-green-950">
                      Resolved
                    </th>
                    <th className="px-4 py-3 font-semibold text-green-950">
                      Avg. Resolution
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {agentPerformance.map((agent, index) => (
                    <tr
                      key={agent.agent_id ?? index}
                      className="border-b border-green-100 last:border-0 hover:bg-green-50"
                    >
                      <td className="px-4 py-4 font-medium text-green-950">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-green-100 p-2">
                            <Users size={17} className="text-green-700" />
                          </div>
                          {agent.agent_name || `Agent ${agent.agent_id ?? ""}`}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-green-800">
                        {numberValue(agent.assigned_incidents)}
                      </td>

                      <td className="px-4 py-4 text-green-800">
                        {numberValue(agent.resolved_incidents)}
                      </td>

                      <td className="px-4 py-4 text-green-800">
                        {formatMinutes(agent.average_resolution_minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
