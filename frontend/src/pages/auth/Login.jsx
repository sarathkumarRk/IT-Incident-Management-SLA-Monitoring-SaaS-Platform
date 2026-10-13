
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/axios";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await API.post("/auth/login", form);

      localStorage.setItem(
        "access_token",
        response.data.access_token
      );

      const userResponse = await API.get("/auth/me");
      const user = userResponse.data;

      localStorage.setItem("user", JSON.stringify(user));

      const role = String(user.role || "").toUpperCase();

      const dashboards = {
        ADMIN: "/admin",
        MANAGER: "/incidents",
        SUPPORT_AGENT: "/incidents",
        AGENT: "/incidents",
        REPORTER: "/incidents",
      };

      const dashboard = dashboards[role];

      if (!dashboard) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        toast.error("Your user role is not supported.");
        return;
      }

      toast.success(
        `Login successful! Welcome, ${user.name || role}.`
      );

      navigate(dashboard, { replace: true });
    } catch (err) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

      const message =
        err.response?.data?.detail ||
        "Login failed. Please check your email and password.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-green-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green-600 text-2xl font-bold text-white">
            I
          </div>

          <h1 className="text-2xl font-bold text-green-700">
            Incident Management
          </h1>

          <p className="mt-2 text-sm text-green-700">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-green-800"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-green-300 px-4 py-3 text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200"
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
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-green-300 px-4 py-3 text-green-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-6 border-t border-green-100 pt-5 text-center">
          <p className="text-sm text-green-700">
            Don't have an account?
          </p>

          <Link
            to="/register"
            className="mt-2 inline-block font-semibold text-green-700 underline-offset-4 transition hover:text-green-900 hover:underline"
          >
            Create an account
          </Link>
        </div>

        <p className="mt-5 text-center text-xs text-green-700">
          Secure access to your incident management system
        </p>
      </div>
    </div>
  );
}

export default Login;

