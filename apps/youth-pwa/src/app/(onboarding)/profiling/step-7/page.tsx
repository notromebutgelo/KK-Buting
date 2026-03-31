"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FooterBranding,
  NextArrowButton,
  ProfilingShell,
  readProfilingDraft,
  saveProfilingDraft,
} from "../profiling-ui";

export default function ProfilingStep7() {
  const router = useRouter();
  const [attendedKkAssembly, setAttendedKkAssembly] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    const saved = readProfilingDraft();
    setAttendedKkAssembly(
      typeof saved.attendedKkAssembly === "boolean"
        ? saved.attendedKkAssembly
        : null
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (attendedKkAssembly === null) return;
    saveProfilingDraft({ attendedKkAssembly });
    router.push(
      attendedKkAssembly ? "/profiling/step-8" : "/profiling/step-9"
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={7}
        title="Demographic Characteristics"
        onBack={() => router.push("/profiling/step-6")}
        actions={<NextArrowButton disabled={attendedKkAssembly === null} />}
      >
        <div className="pf-question-block">
          <h2 className="pf-question-title">
            Have you already attended a KK Assembly?
          </h2>
          <div className="pf-question-actions">
            <button
              type="button"
              className={`pf-yn-btn ${
                attendedKkAssembly === true ? "selected" : "unselected"
              }`}
              onClick={() => setAttendedKkAssembly(true)}
            >
              Yes
            </button>
            <button
              type="button"
              className={`pf-yn-btn ${
                attendedKkAssembly === false ? "selected" : "unselected"
              }`}
              onClick={() => setAttendedKkAssembly(false)}
            >
              No
            </button>
          </div>
        </div>
        <FooterBranding />
      </ProfilingShell>
    </form>
  );
}
