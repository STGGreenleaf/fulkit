"use client";

import { useAuth } from "../lib/auth";
import LogoMark from "../components/LogoMark";
import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("./home/page"), { ssr: false });
const Landing = dynamic(() => import("./landing/page"), { ssr: false });

export default function Root() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LogoMark size={24} />
      </div>
    );
  }

  return user ? <Dashboard /> : <Landing />;
}
