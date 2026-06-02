import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema } from "../schemas/auth.schema.js";
import { authService } from "../services/auth.service.js";
import { Input } from "../components/ui/Input.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { getApiErrorMessage } from "../utils/format.js";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      shopName: "",
      fullName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
    setError("");
    try {
      await authService.register(values);
      navigate("/login", {
        replace: true,
        state: { registered: true },
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-60 w-60 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-60 w-60 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-2xl shadow-slate-200 backdrop-blur">
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-blue-500" />

        <div className="p-8 sm:p-10">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Mobile Shop
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Create account
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Register a staff/admin user to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Alert type="error" message={error} />

            <div className="space-y-4">
              <Input
                label="Shop Name"
                error={errors.shopName?.message}
                {...register("shopName")}
              />
              <Input
                label="Full Name"
                error={errors.fullName?.message}
                {...register("fullName")}
              />
              <Input
                label="Username"
                error={errors.username?.message}
                {...register("username")}
              />
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
                {isSubmitting ? "Creating account..." : "Create account"}
              </span>
              {!isSubmitting && (
                <div className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0" />
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-violet-700 hover:text-violet-800"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

