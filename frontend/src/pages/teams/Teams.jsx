import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../../api/axios";

const initialForm = {
  name: "",
  description: "",
};

function Teams() {
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchTeams = async () => {
    setLoading(true);

    try {
      const response = await API.get("/teams/");
      setTeams(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to load teams."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
    };

    try {
      if (editingId) {
        await API.patch(`/teams/${editingId}`, payload);
        toast.success("Team updated successfully!");
      } else {
        await API.post("/teams/", payload);
        toast.success("Team created successfully!");
      }

      resetForm();
      await fetchTeams();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to save team."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (teamId) => {
    try {
      const response = await API.get(`/teams/${teamId}`);
      setSelectedTeam(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to load team details."
      );
    }
  };

  const handleEdit = (team) => {
    setEditingId(team.id);
    setForm({
      name: team.name || "",
      description: team.description || "",
    });
    setShowForm(true);
    setSelectedTeam(null);
  };

  const handleDelete = async (team) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${team.name}"?`
    );

    if (!confirmed) return;

    try {
      await API.delete(`/teams/${team.id}`);
      toast.success("Team deleted successfully!");
      setSelectedTeam(null);
      await fetchTeams();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to delete team. It may have associated incidents."
      );
    }
  };

  const filteredTeams = teams.filter((team) => {
    const query = search.toLowerCase();

    return (
      String(team.name || "").toLowerCase().includes(query) ||
      String(team.description || "").toLowerCase().includes(query)
    );
  });

  const inputClass =
    "w-full rounded-lg border border-green-300 bg-white px-3 py-2.5 text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200";

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-800">
              Team Management
            </h1>
            <p className="mt-1 text-sm text-green-700">
              Create and manage incident support teams.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
              setSelectedTeam(null);
            }}
            className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
          >
            + Create Team
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-green-200 p-5">
          <p className="text-sm font-medium text-green-700">
            Total Teams
          </p>
          <p className="mt-2 text-3xl font-bold text-green-800">
            {teams.length}
          </p>
        </div>

        {showForm && (
          <section className="mb-6 rounded-xl border border-green-200 p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-green-800">
                {editingId ? "Edit Team" : "Create New Team"}
              </h2>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-green-300 px-3 py-1.5 text-green-700 hover:bg-green-50"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-green-800">
                  Team Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter team name"
                  maxLength={100}
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
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Describe the team's responsibilities"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Team"
                    : "Create Team"}
              </button>
            </form>
          </section>
        )}

        {selectedTeam && (
          <section className="mb-6 rounded-xl border border-green-200 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-green-800">
                Team Details
              </h2>

              <button
                onClick={() => setSelectedTeam(null)}
                className="rounded-lg border border-green-300 px-3 py-1.5 text-green-700 hover:bg-green-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-sm text-green-800">
              <p><strong>ID:</strong> {selectedTeam.id}</p>
              <p><strong>Name:</strong> {selectedTeam.name}</p>
              <p>
                <strong>Description:</strong>{" "}
                {selectedTeam.description || "No description provided"}
              </p>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-green-200">
          <div className="flex flex-col gap-3 border-b border-green-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-green-800">
              All Teams
            </h2>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search teams..."
              className={`${inputClass} sm:max-w-sm`}
            />
          </div>

          {loading ? (
            <p className="p-8 text-center text-green-700">
              Loading teams...
            </p>
          ) : filteredTeams.length === 0 ? (
            <p className="p-8 text-center text-green-700">
              No teams found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-green-50 text-green-800">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Team Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTeams.map((team) => (
                    <tr
                      key={team.id}
                      className="border-t border-green-100"
                    >
                      <td className="px-4 py-3 text-green-700">
                        {team.id}
                      </td>

                      <td className="px-4 py-3 font-medium text-green-800">
                        {team.name}
                      </td>

                      <td className="max-w-xs truncate px-4 py-3 text-green-700">
                        {team.description || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleView(team.id)}
                            className="rounded-md border border-green-300 px-2.5 py-1.5 text-green-700 hover:bg-green-50"
                          >
                            View
                          </button>

                          <button
                            onClick={() => handleEdit(team)}
                            className="rounded-md border border-green-300 px-2.5 py-1.5 text-green-700 hover:bg-green-50"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(team)}
                            className="rounded-md bg-green-600 px-2.5 py-1.5 text-white hover:bg-green-700"
                          >
                            Delete
                          </button>
                        </div>
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

export default Teams;
