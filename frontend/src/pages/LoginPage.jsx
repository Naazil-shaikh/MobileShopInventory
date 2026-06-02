import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { loginSchema } from "../schemas/auth.schema.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { getApiErrorMessage } from "../utils/format.js";

export const LoginPage = () => {
  const { login } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [error, setError] = useState("");
  const registered = Boolean(location.state?.registered);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
    setError("");

    try {
      await login(values);

      const redirect = location.state?.from?.pathname || "/";

      navigate(redirect, {
        replace: true,
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      {/* ── background glow ── */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />

        <div className="absolute bottom-0 left-0 h-60 w-60 rounded-full bg-blue-200/30 blur-3xl" />

        <div className="absolute right-0 top-0 h-60 w-60 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      {/* ── login card ── */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-2xl shadow-slate-200 backdrop-blur">
        {/* top accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-blue-500" />

        <div className="p-8 sm:p-10">
          {/* ── header ── */}
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7l9-4 9 4-9 4-9-4z" />
                <path d="M21 10l-9 4-9-4" />
                <path d="M21 14l-9 4-9-4" />
              </svg>
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Mobile Shop
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Inventory Dashboard
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Sign in to manage products, stock activity,
              <br />
              inventory transactions, and sales.
            </p>
          </div>

          {/* ── form ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {registered && (
              <Alert
                type="success"
                message="Account created successfully. Please sign in."
              />
            )}
            <Alert type="error" message={error} />

            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                error={errors.email?.message}
                {...register("email")}
              />

              <Input
                label="Password"
                type="password"
                error={errors.password?.message}
                {...register("password")}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:bg-violet-700 hover:shadow-violet-300 disabled:cursor-not-allowed disabled:bg-violet-300"
            >
              <span className="relative z-10">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </span>

              {!isSubmitting && (
                <div className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0" />
              )}
            </button>
          </form>

          {/* ── footer ── */}
          <div className="mt-8 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs text-slate-500">
              Don’t have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-violet-700 hover:text-violet-800"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};