"use client";

import { useAuth } from "../lib/auth";
import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("./home/page"), { ssr: false });
const Landing = dynamic(() => import("./landing/page"), { ssr: false });

export default function Root() {
  const { user, loading } = useAuth();

  // Don't show a separate loading mark here — AuthGuard handles the splash.
  // Just hold the eggshell background until auth resolves to avoid double-flash.
  if (loading) {
    return (
      <div style={{ width: "100%", height: "100vh", background: "var(--color-bg, #EFEDE8)" }} />
    );
  }

  return user ? <Dashboard /> : <Landing />;
}
