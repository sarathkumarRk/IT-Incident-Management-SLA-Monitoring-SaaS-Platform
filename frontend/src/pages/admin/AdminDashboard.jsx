import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import API from "../../api/axios";

const GREEN = "#16a34a";

function AdminDashboard() {
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trends, setTrends] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);

      try {
        const results = await Promise.allSettled([
          API.get("/analytics/overview"),
          API.get("/analytics/by-priority"),
          API.get("/analytics/by-category"),
          API.get("/analytics/trends", {
            params: { period: "daily", days: 7 },
          }),
          API.get("/analytics/agent-performance"),
        ]);

        const [overviewResult, priorityResult, categoryResult, trendsResult, agentsResult] =
          results;

        if (overviewResult.status === "fulfilled") {
          setOverview(overviewResult.value.data);
        } else {
          toast.error("Unable to load analytics overview.");
        }

        if (priorityResult.status === "fulfilled") {
          setPriorities(priorityResult.value.data);
        }

        if (categoryResult.status === "fulfilled") {
          setCategories(categoryResult.value.data);
        }

        if (trendsResult.status === "fulfilled") {
          setTrends(trendsResult.value.data.data || []);
        }

        if (agentsResult.status === "fulfilled") {
          setAgents(agentsResult.value.data);
        }
      } catch {
        toast.error("Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = [
    {
      label: "Open Incidents",
      value: overview?.total_open_incidents ?? 0,
      description: "Currently unresolved",
    },
    {
      label: "Resolved Incidents",
      value: overview?.total_resolved_incidents ?? 0,
      description: "Successfully resolved",
    },
    {
      label: "Critical Incidents",
      value: overview?.total_critical_incidents ?? 0,
      description: "Critical priority",
    },
    {
      label: "Breached SLAs",
      value: overview?.total_breached_slas ?? 0,
      description: "Response or resolution breach",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="font-medium text-green-700">
          Loading dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-800 sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-green-700">
              Incident management and SLA monitoring overview
            </p>
          </div>

          <button
            onClick={() => navigate("/incidents")}
            className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
          >
            View Incidents
          </button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-green-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-green-700">
                {stat.label}
              </p>

              <p className="mt-3 text-3xl font-bold text-green-800">
                {stat.value}
              </p>

              <p className="mt-2 text-xs text-green-600">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-green-200 p-5">
            <h2 className="font-semibold text-green-800">
              SLA Compliance
            </h2>

            <p className="mt-4 text-3xl font-bold text-green-700">
              {overview?.sla_compliance_percentage ?? 0}%
            </p>

            <p className="mt-2 text-sm text-green-600">
              Incidents without response or resolution SLA breaches
            </p>
          </div>

          <div className="rounded-xl border border-green-200 p-5">
            <h2 className="font-semibold text-green-800">
              Average Response Time
            </h2>

            <p className="mt-4 text-3xl font-bold text-green-700">
              {overview?.average_first_response_minutes ?? 0} min
            </p>

            <p className="mt-2 text-sm text-green-600">
              Average time to first response
            </p>

            <p className="mt-4 text-sm text-green-700">
              Average resolution:{" "}
              <strong>
                {overview?.average_resolution_minutes ?? 0} min
              </strong>
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-green-200 p-5">
            <h2 className="mb-5 text-lg font-semibold text-green-800">
              Incidents by Priority
            </h2>

            {priorities.length === 0 ? (
              <p className="py-12 text-center text-green-700">
                No priority data available.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorities}>
                    <CartesianGrid
                      stroke="#bbf7d0"
                      strokeDasharray="3 3"
                    />
                    <XAxis dataKey="priority" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="total"
                      name="Incidents"
                      fill={GREEN}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-green-200 p-5">
            <h2 className="mb-5 text-lg font-semibold text-green-800">
              Incidents by Category
            </h2>

            {categories.length === 0 ? (
              <p className="py-12 text-center text-green-700">
                No category data available.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label
                    >
                      {categories.map((item, index) => (
                        <Cell
                          key={`${item.category}-${index}`}
                          fill={GREEN}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>

        <section className="mb-8 rounded-xl border border-green-200 p-5">
          <h2 className="mb-5 text-lg font-semibold text-green-800">
            Incident Trends — Last 7 Days
          </h2>

          {trends.length === 0 ? (
            <p className="py-12 text-center text-green-700">
              No trend data available.
            </p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends}>
                  <CartesianGrid
                    stroke="#bbf7d0"
                    strokeDasharray="3 3"
                  />
                  <XAxis dataKey="period" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="total_incidents"
                    name="Total"
                    fill={GREEN}
                  />
                  <Bar
                    dataKey="resolved_incidents"
                    name="Resolved"
                    fill="#15803d"
                  />
                  <Bar
                    dataKey="open_incidents"
                    name="Open"
                    fill="#86efac"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-green-200 p-5">
          <h2 className="mb-5 text-lg font-semibold text-green-800">
            Agent Performance
          </h2>

          {agents.length === 0 ? (
            <p className="py-8 text-center text-green-700">
              No agent performance data available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-green-50 text-green-800">
                  <tr>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Resolved</th>
                    <th className="px-4 py-3">Avg. Resolution (min)</th>
                  </tr>
                </thead>

                <tbody>
                  {agents.map((agent) => (
                    <tr
                      key={agent.agent_id}
                      className="border-t border-green-100"
                    >
                      <td className="px-4 py-3 font-medium text-green-800">
                        {agent.agent_name}
                      </td>
                      <td className="px-4 py-3 text-green-700">
                        {agent.assigned_incidents}
                      </td>
                      <td className="px-4 py-3 text-green-700">
                        {agent.resolved_incidents}
                      </td>
                      <td className="px-4 py-3 text-green-700">
                        {agent.average_resolution_minutes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;
