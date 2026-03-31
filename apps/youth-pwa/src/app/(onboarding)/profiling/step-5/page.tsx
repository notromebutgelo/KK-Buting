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

export default function ProfilingStep5() {
  const router = useRouter();
  const [votedLastSkElections, setVotedLastSkElections] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    const saved = readProfilingDraft();
    setVotedLastSkElections(
      typeof saved.votedLastSkElections === "boolean"
        ? saved.votedLastSkElections
        : null
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (votedLastSkElections === null) return;
    saveProfilingDraft({ votedLastSkElections });
    router.push("/profiling/step-6");
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={5}
        title="Demographic Characteristics"
        onBack={() => router.push("/profiling/step-4")}
        actions={<NextArrowButton disabled={votedLastSkElections === null} />}
      >
        <div className="pf-question-block">
          <h2 className="pf-question-title">
            Did you vote in the last SK Elections?
          </h2>
          <div className="pf-question-actions">
            <button
              type="button"
              className={`pf-yn-btn ${
                votedLastSkElections === true ? "selected" : "unselected"
              }`}
              onClick={() => setVotedLastSkElections(true)}
            >
              Yes
            </button>
            <button
              type="button"
              className={`pf-yn-btn ${
                votedLastSkElections === false ? "selected" : "unselected"
              }`}
              onClick={() => setVotedLastSkElections(false)}
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
