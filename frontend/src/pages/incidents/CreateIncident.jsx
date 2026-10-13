import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/axios";

const initialForm = {
  title: "",
  description: "",
  category: "",
  priority: "MEDIUM",
  affected_service: "",
  team_id: "",
};

const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const inputClass =
  "w-full rounded-lg border border-green-300 bg-white px-4 py-3 text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200";

function CreateIncident() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadTeams = async () => {
    setLoadingTeams(true);

    try {
      const response = await API.get("/teams/");
      setTeams(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to load teams. You can still create an incident without a team."
      );
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim() || !form.category.trim()) {
      toast.error("Please complete all required fields.");
      return;
    }

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
      toast.error("Please select a valid team.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await API.post("/incidents/", payload);

      toast.success("Incident created successfully!");

      if (response.data?.id) {
        navigate(`/incidents/${response.data.id}`);
      } else {
        navigate("/incidents");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to create incident. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate("/incidents")}
          className="mb-5 rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
        >
          ← Back to Incidents
        </button>

        <div className="rounded-xl border border-green-200 bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-green-800">
            Create Incident
          </h1>

          <p className="mt-2 text-sm text-green-700">
            Report an IT issue for tracking and resolution.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-green-800"
              >
                Incident Title *
              </label>

              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                className={inputClass}
                placeholder="Enter a short incident title"
                maxLength={255}
                required
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-green-800"
              >
                Description *
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                className={inputClass}
                rows={5}
                placeholder="Explain what happened and its impact"
                required
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium text-green-800"
              >
                Category *
              </label>

              <input
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Network, Software, Hardware"
                required
              />
            </div>

            <div>
              <label
                htmlFor="priority"
                className="mb-2 block text-sm font-medium text-green-800"
              >
                Priority *
              </label>

              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={inputClass}
                required
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="affected_service"
                className="mb-2 block text-sm font-medium text-green-800"
              >
                Affected Service
              </label>

              <input
                id="affected_service"
                name="affected_service"
                value={form.affected_service}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Email, Network, Internal Application"
              />
            </div>

            <div>
              <label
                htmlFor="team_id"
                className="mb-2 block text-sm font-medium text-green-800"
              >
                Assign Team (optional)
              </label>

              <select
                id="team_id"
                name="team_id"
                value={form.team_id}
                onChange={handleChange}
                onFocus={() => {
                  if (teams.length === 0 && !loadingTeams) {
                    loadTeams();
                  }
                }}
                className={inputClass}
              >
                <option value="">
                  {loadingTeams ? "Loading teams..." : "No team selected"}
                </option>

                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-green-700">
                Team selection is optional. The team list requires access to
                your backend teams endpoint.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Submit Incident"}
              </button>

              <button
                type="button"
                onClick={() => setForm(initialForm)}
                disabled={submitting}
                className="rounded-lg border border-green-300 px-6 py-3 font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateIncident;
