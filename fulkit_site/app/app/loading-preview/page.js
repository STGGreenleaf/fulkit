"use client";

import LoadingMark from "../../components/LoadingMark";

export default function LoadingPreview() {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg)",
      }}
    >
      <LoadingMark size={50} />
    </div>
  );
}
