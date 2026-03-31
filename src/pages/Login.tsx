"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import logo from "../assert/Logo.jpeg";
import { getDefaultAllowedPath } from "../utils/accessControl";

type ToastState = {
  show: boolean;
  message: string;
  type: "" | "success" | "error";
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, isAuthenticated, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    type: ""
  });

  useEffect(() => {
    if (isAuthenticated && !loading && user) {
      navigate(getDefaultAllowedPath(user), { replace: true });
    }
  }, [isAuthenticated, loading, navigate, user]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      showToast("Please enter both username and password", "error");
      return;
    }

    const result = await login(username, password);

    if (result.success) {
      showToast(
        `Login successful! Welcome, ${result.user?.username || username}`,
        "success"
      );
      setTimeout(() => {
        navigate(getDefaultAllowedPath(result.user), { replace: true });
      }, 1000);
    } else {
      const errorMsg = result.error || "Invalid username or password";
      setError(errorMsg);
      showToast(errorMsg, "error");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f6f9] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(185,28,28,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.15),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      <div className="absolute left-[-8rem] top-12 h-64 w-64 rounded-full bg-red-200/40 blur-3xl" />
      <div className="absolute bottom-[-6rem] right-[-4rem] h-72 w-72 rounded-full bg-slate-300/30 blur-3xl" />

      {toast.show && (
        <div
          className={`fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-sm transition-all duration-300 ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50/95 text-emerald-900"
              : "border-red-200 bg-red-50/95 text-red-900"
          }`}
        >
          <div className="flex items-center justify-center gap-2 text-center">
            {toast.type === "success" ? (
              <ShieldCheck className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium sm:text-base">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center p-3 sm:p-5">
        <div className="w-full max-w-[30rem] rounded-[34px] border border-white/80 bg-white/82 px-4 pb-5 pt-3 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:px-5 sm:pb-6 sm:pt-4">
          <div className="h-1.5 rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#f97316_62%,#fbbf24_100%)]" />

          <div className="mt-3">
            <div className="rounded-[26px] border border-red-100/90 bg-[linear-gradient(180deg,#fff8f7_0%,#ffffff_100%)] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-3">
              <div className="overflow-hidden rounded-[22px] border border-red-200/70 bg-white shadow-[0_16px_30px_-24px_rgba(220,38,38,0.55)]">
                <img
                  src={logo}
                  alt="Sagar TMT & Pipes"
                  className="block h-auto w-full"
                />
              </div>
            </div>

            <div className="pt-4 sm:pt-5">
              <form onSubmit={handleSubmit} className="space-y-4.5">
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-[1rem] font-semibold text-slate-700"
                  >
                    Username
                  </Label>
                  <div className="flex h-12 items-center rounded-[22px] border border-slate-200 bg-white px-3 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.35)] transition-all duration-200 focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#fff3ef] text-[#ef4444]">
                      <User className="h-4 w-4" />
                    </div>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={loading}
                      className="h-full border-0 bg-transparent pl-3 pr-0 text-base text-slate-700 shadow-none placeholder:text-[#94a3b8] focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-[1rem] font-semibold text-slate-700"
                  >
                    Password
                  </Label>
                  <div className="flex h-12 items-center rounded-[22px] border border-slate-200 bg-white px-3 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.35)] transition-all duration-200 focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#fff3ef] text-[#ef4444]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-full border-0 bg-transparent pl-3 pr-2 text-base text-slate-700 shadow-none placeholder:text-[#94a3b8] focus-visible:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-1 h-12 w-full rounded-[20px] bg-[linear-gradient(90deg,#ff1f1f_0%,#ff5a18_58%,#ff7a12_100%)] text-lg font-semibold text-white shadow-[0_18px_34px_-18px_rgba(249,115,22,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-20px_rgba(249,115,22,0.82)]"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            <div className="pt-5 text-center sm:pt-6">
              <p className="text-sm font-medium text-[#94a3b8]">
                Copyright 2026 Sagar TMT & Pipes. Secure internal portal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
