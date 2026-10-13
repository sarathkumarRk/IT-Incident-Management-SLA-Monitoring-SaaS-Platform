
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  ShieldCheck,
  Plus,
  Pencil,
  X,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileWarning,
} from "lucide-react";
import API from "../../api/axios";

const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const initialForm = {
  priority: "CRITICAL",
  first_response_minutes: "15",
  resolution_minutes: "60",
  exclude_pending_time: false,
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(value) {
  const minutes = Number(value ?? 0);

  if (!Number.isFinite(minutes) || minutes < 0) return "—";

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = Math.round(minutes % 60);

    return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  }

  return `${Math.round(minutes)} min`;
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-green-700">{title}</p>
          <p className="mt-2 text-2xl font-bold text-green-950">{value}</p>
        </div>

        <div className="rounded-lg bg-green-100 p-3">
          <Icon size={23} className="text-green-700" />
        </div>
      </div>
    </div>
  );
}

export default function SLAPolicies() {
  const [policies, setPolicies] = useState([]);
  const [breaches, setBreaches] = useState([]);

  const [user, setUser] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [activeTab, setActiveTab] = useState("policies");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [form, setForm] = useState(initialForm);

  const isAdmin = user?.role === "ADMIN";
  const canViewBreaches = ["ADMIN", "MANAGER"].includes(user?.role);

  const fetchData = useCallback(async (showToast = false) => {
    setRefreshing(true);
    setError("");

    try {
      const meResult = await API.get("/auth/me");
      const currentUser = meResult.data;
      setUser(currentUser);

      const requests = [
        API.get("/sla/policies"),
      ];

      if (["ADMIN", "MANAGER"].includes(currentUser?.role)) {
        requests.push(
          API.get("/sla/breaches", {
            params: { page, limit },
          })
        );
      }

      const results = await Promise.allSettled(requests);

      if (results[0].status === "fulfilled") {
        setPolicies(
          Array.isArray(results[0].value.data)
            ? results[0].value.data
            : []
        );
      } else {
        throw results[0].reason;
      }

      if (requests.length > 1) {
        if (results[1].status === "fulfilled") {
          setBreaches(
            Array.isArray(results[1].value.data)
              ? results[1].value.data
              : []
          );
        } else {
          setBreaches([]);
          toast.error(
            results[1].reason?.response?.data?.detail ||
              "Unable to load SLA breaches."
          );
        }
      } else {
        setBreaches([]);
      }

      if (showToast) {
        toast.success("SLA data refreshed.");
      }
    } catch (err) {
      const message =
        err.response?.data?.detail || "Unable to load SLA data.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingPolicy(null);

    const availablePriority = PRIORITIES.find(
      (priority) =>
        !policies.some((policy) => policy.priority === priority)
    );

    if (!availablePriority) {
      toast.info("An SLA policy already exists for every priority.");
      return;
    }

    setForm({
      ...initialForm,
      priority: availablePriority,
    });

    setModalOpen(true);
  };

  const openEditModal = (policy) => {
    setEditingPolicy(policy);

    setForm({
      priority: policy.priority,
      first_response_minutes: String(
        policy.first_response_minutes
      ),
      resolution_minutes: String(policy.resolution_minutes),
      exclude_pending_time: Boolean(policy.exclude_pending_time),
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingPolicy(null);
    setForm(initialForm);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const firstResponse = Number(form.first_response_minutes);
    const resolution = Number(form.resolution_minutes);

    if (
      !Number.isInteger(firstResponse) ||
      !Number.isInteger(resolution) ||
      firstResponse <= 0 ||
      resolution <= 0
    ) {
      toast.error("Enter positive whole numbers for SLA time targets.");
      return;
    }

    const payload = {
      priority: form.priority,
      first_response_minutes: firstResponse,
      resolution_minutes: resolution,
      exclude_pending_time: form.exclude_pending_time,
    };

    setSaving(true);

    try {
      if (editingPolicy) {
        await API.patch(
          `/sla/policies/${editingPolicy.id}`,
          payload
        );

        toast.success("SLA policy updated successfully.");
      } else {
        await API.post("/sla/policies", payload);
        toast.success("SLA policy created successfully.");
      }

      setModalOpen(false);
      setEditingPolicy(null);
      setForm(initialForm);

      await fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Unable to save SLA policy."
      );
    } finally {
      setSaving(false);
    }
  };

  const totalPolicies = policies.length;
  const totalBreaches = breaches.length;
  const criticalBreaches = breaches.filter(
    (item) => item.priority === "CRITICAL"
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-green-700">
        <RefreshCw size={22} className="animate-spin" />
        <span className="font-medium">Loading SLA data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50/50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-100 p-3">
              <ShieldCheck size={27} className="text-green-700" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-green-950 sm:text-3xl">
                SLA Monitoring
              </h1>
              <p className="mt-1 text-sm text-green-700">
                Manage service-level targets and monitor SLA breaches.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 font-medium text-white transition hover:bg-green-800"
              >
                <Plus size={18} />
                Create Policy
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-2.5 font-medium text-green-800 transition hover:bg-green-50 disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-green-200 bg-white p-4 text-sm text-green-800">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Active SLA Policies"
            value={totalPolicies}
            icon={ShieldCheck}
          />

          <StatCard
            title="Breaches on This Page"
            value={totalBreaches}
            icon={AlertTriangle}
          />

          <StatCard
            title="Critical Breaches on This Page"
            value={criticalBreaches}
            icon={FileWarning}
          />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-green-200">
          <button
            type="button"
            onClick={() => setActiveTab("policies")}
            className={`rounded-t-lg px-5 py-3 text-sm font-semibold transition ${
              activeTab === "policies"
                ? "border-b-2 border-green-700 bg-green-100 text-green-900"
                : "text-green-700 hover:bg-green-50"
            }`}
          >
            SLA Policies
          </button>

          {canViewBreaches && (
            <button
              type="button"
              onClick={() => setActiveTab("breaches")}
              className={`rounded-t-lg px-5 py-3 text-sm font-semibold transition ${
                activeTab === "breaches"
                  ? "border-b-2 border-green-700 bg-green-100 text-green-900"
                  : "text-green-700 hover:bg-green-50"
              }`}
            >
              SLA Breaches
            </button>
          )}
        </div>

        {/* Policies */}
        {activeTab === "policies" && (
          <section className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm">
            <div className="border-b border-green-100 p-5">
              <h2 className="text-lg font-semibold text-green-950">
                SLA Policy Configuration
              </h2>
              <p className="mt-1 text-sm text-green-700">
                Define first-response and resolution targets for each priority.
              </p>
            </div>

            {policies.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
                <ShieldCheck size={35} className="text-green-700" />
                <p className="mt-3 font-semibold text-green-950">
                  No active SLA policies
                </p>
                <p className="mt-1 text-sm text-green-700">
                  {isAdmin
                    ? "Create an SLA policy to configure your service targets."
                    : "Ask an administrator to configure SLA policies."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-green-200 bg-green-50">
                      <th className="px-5 py-4 font-semibold text-green-950">
                        Priority
                      </th>
                      <th className="px-5 py-4 font-semibold text-green-950">
                        First Response
                      </th>
                      <th className="px-5 py-4 font-semibold text-green-950">
                        Resolution Target
                      </th>
                      <th className="px-5 py-4 font-semibold text-green-950">
                        Exclude Pending Time
                      </th>
                      {isAdmin && (
                        <th className="px-5 py-4 text-right font-semibold text-green-950">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {policies.map((policy) => (
                      <tr
                        key={policy.id}
                        className="border-b border-green-100 last:border-0 hover:bg-green-50"
                      >
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800">
                            {policy.priority}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-green-900">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-green-700" />
                            {formatMinutes(
                              policy.first_response_minutes
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-green-900">
                          {formatMinutes(policy.resolution_minutes)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-2 text-green-800">
                            <CheckCircle size={16} />
                            {policy.exclude_pending_time ? "Yes" : "No"}
                          </span>
                        </td>

                        {isAdmin && (
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openEditModal(policy)}
                              className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 font-medium text-green-800 transition hover:bg-green-100"
                            >
                              <Pencil size={15} />
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Breaches */}
        {activeTab === "breaches" && canViewBreaches && (
          <section className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm">
            <div className="border-b border-green-100 p-5">
              <h2 className="text-lg font-semibold text-green-950">
                SLA Breach Records
              </h2>
              <p className="mt-1 text-sm text-green-700">
                Incidents that breached their response or resolution deadlines.
              </p>
            </div>

            {breaches.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
                <CheckCircle size={35} className="text-green-700" />
                <p className="mt-3 font-semibold text-green-950">
                  No SLA breaches on this page
                </p>
                <p className="mt-1 text-sm text-green-700">
                  No breach records were returned for the current page.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-green-200 bg-green-50">
                      <th className="px-4 py-4 font-semibold text-green-950">
                        Incident
                      </th>
                      <th className="px-4 py-4 font-semibold text-green-950">
                        Priority
                      </th>
                      <th className="px-4 py-4 font-semibold text-green-950">
                        Status
                      </th>
                      <th className="px-4 py-4 font-semibold text-green-950">
                        Response Deadline
                      </th>
                      <th className="px-4 py-4 font-semibold text-green-950">
                        Resolution Deadline
                      </th>
                      <th className="px-4 py-4 font-semibold text-green-950">
                        Breach Type
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {breaches.map((breach) => (
                      <tr
                        key={breach.incident_id}
                        className="border-b border-green-100 last:border-0 hover:bg-green-50"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-green-950">
                            #{breach.incident_id}
                          </p>
                          <p className="mt-1 max-w-xs break-words text-green-700">
                            {breach.title}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-green-900">
                          {breach.priority}
                        </td>

                        <td className="px-4 py-4 text-green-900">
                          {breach.status}
                        </td>

                        <td className="px-4 py-4 text-green-800">
                          {formatDate(breach.first_response_deadline)}
                        </td>

                        <td className="px-4 py-4 text-green-800">
                          {formatDate(breach.resolution_deadline)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            {breach.response_breached && (
                              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                                Response
                              </span>
                            )}

                            {breach.resolution_breached && (
                              <span className="rounded-full bg-green-200 px-2.5 py-1 text-xs font-semibold text-green-900">
                                Resolution
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-green-100 p-4">
              <p className="text-sm text-green-700">
                Page {page} · {breaches.length} record(s)
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1 || refreshing}
                  className="rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-50 disabled:opacity-50"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={breaches.length < limit || refreshing}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-green-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="my-auto w-full max-w-lg rounded-2xl border border-green-100 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-green-100 p-5">
              <div>
                <h2 className="text-xl font-bold text-green-950">
                  {editingPolicy ? "Edit SLA Policy" : "Create SLA Policy"}
                </h2>
                <p className="mt-1 text-sm text-green-700">
                  Configure response and resolution targets.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-green-700 hover:bg-green-100 disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div>
                <label
                  htmlFor="priority"
                  className="mb-2 block text-sm font-medium text-green-900"
                >
                  Priority
                </label>

                <select
                  id="priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  disabled={Boolean(editingPolicy)}
                  required
                  className="w-full rounded-lg border border-green-200 bg-white px-3 py-2.5 text-green-950 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-green-50"
                >
                  {PRIORITIES.map((priority) => {
                    const alreadyExists = policies.some(
                      (policy) => policy.priority === priority
                    );

                    return (
                      <option
                        key={priority}
                        value={priority}
                        disabled={
                          !editingPolicy && alreadyExists
                        }
                      >
                        {priority}
                      </option>
                    );
                  })}
                </select>

                {editingPolicy && (
                  <p className="mt-1 text-xs text-green-700">
                    Priority editing is disabled for an existing policy.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="first_response_minutes"
                  className="mb-2 block text-sm font-medium text-green-900"
                >
                  First Response Target (minutes)
                </label>

                <input
                  id="first_response_minutes"
                  name="first_response_minutes"
                  type="number"
                  min="1"
                  step="1"
                  value={form.first_response_minutes}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-green-200 px-3 py-2.5 text-green-950 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  placeholder="Example: 15"
                />
              </div>

              <div>
                <label
                  htmlFor="resolution_minutes"
                  className="mb-2 block text-sm font-medium text-green-900"
                >
                  Resolution Target (minutes)
                </label>

                <input
                  id="resolution_minutes"
                  name="resolution_minutes"
                  type="number"
                  min="1"
                  step="1"
                  value={form.resolution_minutes}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-green-200 px-3 py-2.5 text-green-950 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  placeholder="Example: 60"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-green-100 bg-green-50 p-4">
                <input
                  type="checkbox"
                  name="exclude_pending_time"
                  checked={form.exclude_pending_time}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 accent-green-700"
                />

                <span>
                  <span className="block text-sm font-semibold text-green-950">
                    Exclude pending time
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-green-700">
                    Enable this if time spent in PENDING status should be
                    excluded from SLA calculations. Backend SLA logic must
                    implement this setting for it to affect deadlines.
                  </span>
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-green-200 px-5 py-2.5 font-medium text-green-800 hover:bg-green-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-5 py-2.5 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <RefreshCw size={17} className="animate-spin" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingPolicy
                      ? "Update Policy"
                      : "Create Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
