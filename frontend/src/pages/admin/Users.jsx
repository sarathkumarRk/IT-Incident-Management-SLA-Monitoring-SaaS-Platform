import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../../api/axios";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "SUPPORT_AGENT",
};

const roles = [
  "MANAGER",
  "SUPPORT_AGENT",
  "REPORTER",
];

function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const response = await API.get("/users/");
      setUsers(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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

    try {
      if (editingId) {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
        };

        if (form.password.trim()) {
          payload.password = form.password;
        }

        await API.patch(`/users/${editingId}`, payload);
        toast.success("User updated successfully!");
      } else {
        await API.post("/users/", form);
        toast.success("User created successfully!");
      }

      resetForm();
      await fetchUsers();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to save user details."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "SUPPORT_AGENT",
    });
    setShowForm(true);
    setSelectedUser(null);
  };

  const handleView = async (userId) => {
    try {
      const response = await API.get(`/users/${userId}`);
      setSelectedUser(response.data);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to load user details."
      );
    }
  };

  const handleDeactivate = async (user) => {
    if (!user.is_active) {
      toast.info("This user is already inactive.");
      return;
    }

    const confirmed = window.confirm(
      `Deactivate ${user.name}? They will no longer be able to log in.`
    );

    if (!confirmed) return;

    try {
      await API.patch(`/users/${user.id}/deactivate`);
      toast.success("User deactivated successfully!");
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Unable to deactivate user."
      );
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = search.toLowerCase();

    return (
      String(user.name || "").toLowerCase().includes(query) ||
      String(user.email || "").toLowerCase().includes(query) ||
      String(user.role || "").toLowerCase().includes(query)
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
              User Management
            </h1>
            <p className="mt-1 text-sm text-green-700">
              Create, view, update, and deactivate users.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
              setSelectedUser(null);
            }}
            className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
          >
            + Create User
          </button>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-green-200 p-4">
            <p className="text-sm text-green-700">Total Users</p>
            <p className="mt-2 text-2xl font-bold text-green-800">
              {users.length}
            </p>
          </div>

          <div className="rounded-xl border border-green-200 p-4">
            <p className="text-sm text-green-700">Active Users</p>
            <p className="mt-2 text-2xl font-bold text-green-800">
              {users.filter((user) => user.is_active).length}
            </p>
          </div>

          <div className="rounded-xl border border-green-200 p-4">
            <p className="text-sm text-green-700">Inactive Users</p>
            <p className="mt-2 text-2xl font-bold text-green-800">
              {users.filter((user) => !user.is_active).length}
            </p>
          </div>
        </div>

        {showForm && (
          <section className="mb-6 rounded-xl border border-green-200 p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-green-800">
                {editingId ? "Update User" : "Create New User"}
              </h2>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-green-300 px-3 py-1.5 text-green-700 hover:bg-green-50"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-green-800">
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-green-800">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Enter email"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-green-800">
                    {editingId
                      ? "New Password (optional)"
                      : "Password"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={
                      editingId
                        ? "Leave blank to keep current password"
                        : "Enter password"
                    }
                    minLength={editingId ? undefined : 8}
                    required={!editingId}
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-green-800">
                    Role
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update User"
                    : "Create User"}
              </button>
            </form>
          </section>
        )}

        {selectedUser && (
          <section className="mb-6 rounded-xl border border-green-200 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-green-800">
                User Details
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg border border-green-300 px-3 py-1.5 text-green-700 hover:bg-green-50"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <p className="text-green-800">
                <strong>ID:</strong> {selectedUser.id}
              </p>
              <p className="text-green-800">
                <strong>Name:</strong> {selectedUser.name}
              </p>
              <p className="text-green-800">
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p className="text-green-800">
                <strong>Role:</strong> {selectedUser.role}
              </p>
              <p className="text-green-800">
                <strong>Status:</strong>{" "}
                {selectedUser.is_active ? "Active" : "Inactive"}
              </p>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-green-200">
          <div className="flex flex-col gap-3 border-b border-green-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-green-800">
              All Users
            </h2>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or role..."
              className={`${inputClass} sm:max-w-sm`}
            />
          </div>

          {loading ? (
            <p className="p-8 text-center text-green-700">
              Loading users...
            </p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-8 text-center text-green-700">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-green-50 text-green-800">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t border-green-100"
                    >
                      <td className="px-4 py-3 text-green-700">
                        {user.id}
                      </td>

                      <td className="px-4 py-3 font-medium text-green-800">
                        {user.name}
                      </td>

                      <td className="px-4 py-3 text-green-700">
                        {user.email}
                      </td>

                      <td className="px-4 py-3 text-green-700">
                        {user.role}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700">
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleView(user.id)}
                            className="rounded-md border border-green-300 px-2.5 py-1.5 text-green-700 hover:bg-green-50"
                          >
                            View
                          </button>

                          <button
                            onClick={() => handleEdit(user)}
                            className="rounded-md border border-green-300 px-2.5 py-1.5 text-green-700 hover:bg-green-50"
                          >
                            Edit
                          </button>

                          {user.is_active && (
                            <button
                              onClick={() => handleDeactivate(user)}
                              className="rounded-md bg-green-600 px-2.5 py-1.5 text-white hover:bg-green-700"
                            >
                              Deactivate
                            </button>
                          )}
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

export default Users;
