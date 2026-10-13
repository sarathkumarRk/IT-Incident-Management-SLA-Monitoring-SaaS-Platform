import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/axios";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      await API.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      toast.success("Admin registered successfully!");

      setForm({
        name: "",
        email: "",
        password: "",
      });

      navigate("/login");
    } catch (err) {
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        detail.forEach((item) => {
          toast.error(
            `${item.loc?.join(" → ")}: ${item.msg}`
          );
        });
      } else {
        toast.error(
          typeof detail === "string"
            ? detail
            : "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-lg rounded-xl border border-green-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-600 text-2xl font-bold text-white">
            I
          </div>

          <h1 className="text-2xl font-bold text-green-700">
            Create Admin
          </h1>

          <p className="mt-2 text-sm text-green-700">
            Register the first administrator account
          </p>
        </div>

        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-800">
            Account Role: Admin
          </p>

          <p className="mt-1 text-sm text-green-700">
            Only the first Admin account can be registered here.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-green-800"
            >
              Full Name
            </label>

            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter full name"
              autoComplete="name"
              required
              disabled={loading}
              className="w-full rounded-lg border border-green-300 px-4 py-3 text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-green-800"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter email address"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full rounded-lg border border-green-300 px-4 py-3 text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-green-800"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a password"
              autoComplete="new-password"
              required
              disabled={loading}
              className="w-full rounded-lg border border-green-300 px-4 py-3 text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating Admin..." : "Create Admin"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full rounded-lg border border-green-600 px-4 py-3 font-semibold text-green-700 transition hover:bg-green-50"
          >
            Back to Login
          </button>
        </form>

        <div className="mt-6 border-t border-green-100 pt-5 text-center">
          <p className="text-sm text-green-700">
            Already have an account?
          </p>

          <Link
            to="/login"
            className="mt-2 inline-block font-semibold text-green-700 underline-offset-4 transition hover:text-green-900 hover:underline"
          >
            Sign in to your account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;

