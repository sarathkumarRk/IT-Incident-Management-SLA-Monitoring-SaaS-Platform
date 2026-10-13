import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../../api/axios";

const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING",
  "RESOLVED",
  "CLOSED",
];

const STATUS_TRANSITIONS = {
  OPEN: ["ASSIGNED", "CLOSED"],
  ASSIGNED: ["IN_PROGRESS", "PENDING", "RESOLVED"],
  IN_PROGRESS: ["PENDING", "RESOLVED"],
  PENDING: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".doc",
  ".docx",
  ".txt",
  ".csv",
  ".xlsx",
];

const initialForm = {
  title: "",
  description: "",
  category: "",
  priority: "MEDIUM",
  affected_service: "",
  team_id: "",
};

const inputClass =
  "w-full rounded-lg border border-green-300 bg-white px-3 py-2.5 text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200";

function IncidentList() {
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    category: "",
    assignee_id: "",
    date_from: "",
    date_to: "",
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    assigned_to: "",
    reason: "",
  });

  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const role = String(currentUser?.role || "").toUpperCase();
  const canAssign = ["ADMIN", "MANAGER"].includes(role);
  const canCreate = [
    "ADMIN",
    "MANAGER",
    "SUPPORT_AGENT",
    "REPORTER",
  ].includes(role);

  const fetchCurrentUser = async () => {
    try {
      const response = await API.get("/auth/me");
      setCurrentUser(response.data);
    } catch {
      const savedUser = localStorage.getItem("user");

      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch {
          setCurrentUser(null);
        }
      }
    }
  };

  const fetchIncidents = async (requestedPage = page) => {
    setLoading(true);

    try {
      const params = {
        page: requestedPage,
        limit: 10,
      };

      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category.trim()) {
        params.category = filters.category.trim();
      }
      if (filters.assignee_id) {
        const assigneeId = Number(filters.assignee_id);

        if (!Number.isInteger(assigneeId) || assigneeId < 1) {
          toast.error("Assignee ID must be a positive number.");
          setLoading(false);
          return;
        }

        params.assignee_id = assigneeId;
      }
      if (filters.date_from) {
        params.date_from = new Date(
          `${filters.date_from}T00:00:00`
        ).toISOString();
      }
      if (filters.date_to) {
        params.date_to = new Date(
          `${filters.date_to}T23:59:59`
        ).toISOString();
      }

      const response = await API.get("/incidents/", { params });
      const data = response.data;

      setIncidents(Array.isArray(data) ? data : []);
      setHasNextPage(Array.isArray(data) && data.length === 10);
    } catch (error) {
      setIncidents([]);
      setHasNextPage(false);
      toast.error(
        error.response?.data?.detail ||
          "Unable to load incidents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    fetchIncidents(page);
  }, [
    page,
    filters.status,
    filters.priority,
    filters.category,
    filters.assignee_id,
    filters.date_from,
    filters.date_to,
  ]);

  const handleFilterChange = (event) => {
    setPage(1);
    setFilters((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleCreateChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleCreateIncident = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required.");
      return;
    }

    setCreating(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      priority: form.priority,
      affected_service: form.affected_service.trim() || null,
      team_id: form.team_id ? Number(form.team_id) : null,
    };

    if (
      payload.team_id !== null &&
      (!Number.isInteger(payload.team_id) || payload.team_id < 1)
    ) {
      toast.error("Team ID must be a positive number.");
      setCreating(false);
      return;
    }

    try {
      await API.post("/incidents/", payload);

      toast.success("Incident created successfully!");
      setForm(initialForm);
      setShowForm(false);
      setPage(1);

      if (page === 1) {
        await fetchIncidents(1);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to create incident."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (incident, newStatus) => {
    if (!newStatus || newStatus === incident.status) return;

    let resolutionDetails = null;

    if (newStatus === "RESOLVED") {
      resolutionDetails = window.prompt(
        "Enter resolution details (required):"
      );

      if (!resolutionDetails?.trim()) {
        toast.info("Resolution details are required.");
        return;
      }
    }

    const comment = window.prompt(
      "Add a status update comment (optional):"
    );

    const payload = {
      status: newStatus,
      comment: comment?.trim() || null,
    };

    if (newStatus === "RESOLVED") {
      payload.resolution_details = resolutionDetails.trim();
    }

    setStatusUpdatingId(incident.id);

    try {
      await API.patch(
        `/incidents/${incident.id}/status`,
        payload
      );

      toast.success("Incident status updated successfully!");
      await fetchIncidents(page);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to update incident status."
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openAssignmentForm = (incident) => {
    setAssigningId(incident.id);
    setAssignmentForm({
      assigned_to: "",
      reason: "",
    });
  };

  const handleAssign = async (event) => {
    event.preventDefault();

    const assignedTo = Number(assignmentForm.assigned_to);

    if (!Number.isInteger(assignedTo) || assignedTo < 1) {
      toast.error("Enter a valid Support Agent user ID.");
      return;
    }

    try {
      await API.patch(`/incidents/${assigningId}/assign`, {
        assigned_to: assignedTo,
        reason: assignmentForm.reason.trim() || null,
      });

      toast.success("Incident assigned successfully!");
      setAssigningId(null);
      await fetchIncidents(page);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to assign incident."
      );
    }
  };

  const handleAttachment = async (incidentId, file) => {
    if (!file) return;

    const extension = `.${file.name.split(".").pop().toLowerCase()}`;

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error("This file type is not allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10 MB.");
      return;
    }

    if (file.size === 0) {
      toast.error("The selected file is empty.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      await API.post(
        `/incidents/${incidentId}/attachments`,
        formData
      );

      toast.success("Attachment uploaded successfully!");
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to upload attachment."
      );
    }
  };

  const visibleIncidents = incidents.filter((incident) => {
    const query = filters.search.trim().toLowerCase();

    return (
      !query ||
      String(incident.title || "").toLowerCase().includes(query) ||
      String(incident.description || "").toLowerCase().includes(query) ||
      String(incident.id || "").includes(query)
    );
  });

  const priorityClass = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return "border-2 border-green-700 font-bold";
      case "HIGH":
        return "border border-green-600 font-semibold";
      case "MEDIUM":
        return "border border-green-400";
      default:
        return "border border-green-200";
    }
  };

  const statusClass = () =>
    "inline-flex rounded-full border border-green-300 px-2.5 py-1 text-xs font-medium text-green-800";

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-800">
              Incident Management
            </h1>
            <p className="mt-1 text-sm text-green-700">
              Track, filter, assign, and update incidents.
            </p>
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => setShowForm((previous) => !previous)}
              className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
            >
              {showForm ? "Close Form" : "+ Create Incident"}
            </button>
          )}
        </div>

        {showForm && (
          <section className="mb-6 rounded-xl border border-green-200 p-5">
            <h2 className="mb-5 text-lg font-semibold text-green-800">
              Create New Incident
            </h2>

            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-green-800">
                  Title
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleCreateChange}
                  className={inputClass}
                  placeholder="Enter incident title"
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-green-800">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleCreateChange}
                  className={inputClass}
                  rows={4}
                  placeholder="Describe the incident"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-green-800">
                    Category
                  </label>
                  <input
                    name="category"
                    value={form.category}
                    onChange={handleCreateChange}
                    className={inputClass}
                    placeholder="Enter incident category"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-green-800">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleCreateChange}
                    className={inputClass}
                    required
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-green-800">
                    Affected Service
                  </label>
                  <input
                    name="affected_service"
                    value={form.affected_service}
                    onChange={handleCreateChange}
                    className={inputClass}
                    placeholder="e.g. Email, Network, Application"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-green-800">
                    Team ID (optional)
                  </label>
                  <input
                    type="number"
                    name="team_id"
                    value={form.team_id}
                    onChange={handleCreateChange}
                    className={inputClass}
                    min="1"
                    placeholder="Enter existing team ID"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create Incident"}
              </button>
            </form>
          </section>
        )}

        {assigningId !== null && (
          <section className="mb-6 rounded-xl border border-green-200 p-5">
            <h2 className="mb-4 text-lg font-semibold text-green-800">
              Assign Incident #{assigningId}
            </h2>

            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-green-800">
                  Support Agent User ID
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={assignmentForm.assigned_to}
                  onChange={(event) =>
                    setAssignmentForm((previous) => ({
                      ...previous,
                      assigned_to: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Enter active SUPPORT_AGENT user ID"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-green-800">
                  Assignment Reason (optional)
                </label>
                <textarea
                  value={assignmentForm.reason}
                  onChange={(event) =>
                    setAssignmentForm((previous) => ({
                      ...previous,
                      reason: event.target.value,
                    }))
                  }
                  className={inputClass}
                  rows={2}
                  placeholder="Enter assignment reason"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700"
                >
                  Assign Incident
                </button>

                <button
                  type="button"
                  onClick={() => setAssigningId(null)}
                  className="rounded-lg border border-green-300 px-5 py-2.5 font-semibold text-green-700 hover:bg-green-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mb-6 rounded-xl border border-green-200 p-4">
          <h2 className="mb-4 font-semibold text-green-800">
            Filter Incidents
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="Search loaded incidents..."
            />

            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className={inputClass}
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>

            <select
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className={inputClass}
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>

            <input
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className={inputClass}
              placeholder="Filter by category"
            />

            <input
              type="number"
              min="1"
              name="assignee_id"
              value={filters.assignee_id}
              onChange={handleFilterChange}
              className={inputClass}
              placeholder="Assignee user ID"
            />

            <input
              type="date"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
              className={inputClass}
              aria-label="Created from date"
            />

            <input
              type="date"
              name="date_to"
              value={filters.date_to}
              min={filters.date_from || undefined}
              onChange={handleFilterChange}
              className={inputClass}
              aria-label="Created to date"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setFilters({
                search: "",
                status: "",
                priority: "",
                category: "",
                assignee_id: "",
                date_from: "",
                date_to: "",
              });
              setPage(1);
            }}
            className="mt-4 rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
          >
            Clear Filters
          </button>
        </section>

        <section className="overflow-hidden rounded-xl border border-green-200">
          <div className="flex flex-col gap-2 border-b border-green-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-green-800">
              Incidents
            </h2>
            <p className="text-sm text-green-700">
              Page {page} · {visibleIncidents.length} displayed
            </p>
          </div>

          {loading ? (
            <p className="p-10 text-center text-green-700">
              Loading incidents...
            </p>
          ) : visibleIncidents.length === 0 ? (
            <p className="p-10 text-center text-green-700">
              No incidents found for these filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-green-50 text-green-800">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Incident</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleIncidents.map((incident) => {
                    const allowedTransitions =
                      STATUS_TRANSITIONS[incident.status] || [];

                    return (
                      <tr
                        key={incident.id}
                        className="border-t border-green-100 align-top"
                      >
                        <td className="px-4 py-4 text-green-700">
                          #{incident.id}
                        </td>

                        <td className="max-w-xs px-4 py-4">
                          <p className="font-semibold text-green-800">
                            {incident.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-green-700">
                            {incident.description}
                          </p>
                          {incident.affected_service && (
                            <p className="mt-1 text-xs text-green-700">
                              Service: {incident.affected_service}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs text-green-800 ${priorityClass(
                              incident.priority
                            )}`}
                          >
                            {incident.priority}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className={statusClass()}>
                            {incident.status?.replace("_", " ")}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-green-700">
                          {incident.category || "—"}
                        </td>

                        <td className="px-4 py-4 text-green-700">
                          {incident.created_at
                            ? new Date(
                                incident.created_at
                              ).toLocaleDateString()
                            : "—"}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex min-w-48 flex-col gap-2">
                            <a
                              href={`/incidents/${incident.id}`}
                              className="rounded-md border border-green-300 px-3 py-2 text-center font-medium text-green-700 hover:bg-green-50"
                            >
                              View Details
                            </a>

                            {canAssign &&
                              !["RESOLVED", "CLOSED"].includes(
                                incident.status
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAssignmentForm(incident)
                                  }
                                  className="rounded-md border border-green-300 px-3 py-2 font-medium text-green-700 hover:bg-green-50"
                                >
                                  Assign
                                </button>
                              )}

                            {allowedTransitions.length > 0 && (
                              <select
                                value=""
                                disabled={
                                  statusUpdatingId === incident.id
                                }
                                onChange={(event) =>
                                  handleStatusChange(
                                    incident,
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                                aria-label={`Update status for incident ${incident.id}`}
                              >
                                <option value="">
                                  {statusUpdatingId === incident.id
                                    ? "Updating..."
                                    : "Change status"}
                                </option>
                                {allowedTransitions.map((status) => (
                                  <option key={status} value={status}>
                                    {status.replace("_", " ")}
                                  </option>
                                ))}
                              </select>
                            )}

                            <label className="cursor-pointer rounded-md border border-green-300 px-3 py-2 text-center font-medium text-green-700 hover:bg-green-50">
                              Upload Attachment
                              <input
                                type="file"
                                className="hidden"
                                accept={ALLOWED_EXTENSIONS.join(",")}
                                onChange={(event) => {
                                  const file =
                                    event.target.files?.[0];
                                  handleAttachment(
                                    incident.id,
                                    file
                                  );
                                  event.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-green-100 p-4">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((previous) => previous - 1)}
              className="rounded-lg border border-green-300 px-4 py-2 font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-green-700">
              Page {page}
            </span>

            <button
              type="button"
              disabled={!hasNextPage || loading}
              onClick={() => setPage((previous) => previous + 1)}
              className="rounded-lg border border-green-300 px-4 py-2 font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default IncidentList;
