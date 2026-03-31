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

const attendanceOptions = ["1-2 times", "3-4 times", "5 and above"];

export default function ProfilingStep8() {
  const router = useRouter();
  const [attendanceLabel, setAttendanceLabel] = useState("");

  useEffect(() => {
    const saved = readProfilingDraft();
    if (saved.attendedKkAssembly === false) {
      router.replace("/profiling/step-9");
      return;
    }

    const savedTimes = saved.kkAssemblyTimesAttended;
    if (savedTimes && savedTimes > 0) {
      if (savedTimes <= 2) setAttendanceLabel("1-2 times");
      else if (savedTimes <= 4) setAttendanceLabel("3-4 times");
      else setAttendanceLabel("5 and above");
    }
  }, []);

  const isValid = Boolean(attendanceLabel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const kkAssemblyTimesAttended =
      attendanceLabel === "1-2 times" ? 2 : attendanceLabel === "3-4 times" ? 4 : 5;

    saveProfilingDraft({
      attendedKkAssembly: true,
      kkAssemblyTimesAttended,
      kkAssemblyReason: "",
    });
    router.push("/profiling/review");
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={8}
        title="Demographic Characteristics"
        onBack={() => router.push("/profiling/step-7")}
        actions={<NextArrowButton disabled={!isValid} />}
      >
        <div className="pf-question-block">
          <h2 className="pf-question-title">
            If yes, how many times have you attended?
          </h2>
          <div className="pf-question-actions">
            {attendanceOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`pf-choice-btn ${
                  attendanceLabel === option ? "selected" : "unselected"
                }`}
                onClick={() => setAttendanceLabel(option)}
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
