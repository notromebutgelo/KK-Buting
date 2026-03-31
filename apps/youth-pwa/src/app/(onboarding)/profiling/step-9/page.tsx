"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  NextArrowButton,
  FooterBranding,
  ProfilingShell,
  readProfilingDraft,
  saveProfilingDraft,
} from "../profiling-ui";

export default function ProfilingStep9() {
  const router = useRouter();
  const [attendanceReason, setAttendanceReason] = useState("");

  const noAttendanceOptions = [
    "There was no KK Meeting Assembly",
    "Not interested to attend",
  ];

  useEffect(() => {
    const saved = readProfilingDraft();

    if (saved.attendedKkAssembly === true) {
      router.replace("/profiling/step-8");
      return;
    }

    setAttendanceReason(saved.kkAssemblyReason || "");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceReason) return;

    saveProfilingDraft({
      attendedKkAssembly: false,
      kkAssemblyTimesAttended: 0,
      kkAssemblyReason: attendanceReason,
    });
    router.push("/profiling/review");
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={9}
        title="Demographic Characteristics"
        onBack={() => router.push("/profiling/step-7")}
        actions={<NextArrowButton disabled={!attendanceReason} />}
      >
        <div className="pf-question-block">
          <h2 className="pf-question-title">
            If no, why haven&apos;t you attended?
          </h2>
          <div className="pf-question-actions">
            {noAttendanceOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`pf-choice-btn ${
                  attendanceReason === option ? "selected" : "unselected"
                }`}
                onClick={() => setAttendanceReason(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <FooterBranding />
      </ProfilingShell>
    </form>
  );
}
