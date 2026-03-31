"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FooterBranding } from "../profiling-ui";

export default function ProfilingSucessPage() {
  const router = useRouter();

  return (
    <div className="pf-success-page">
      <div className="pf-success-topbar">
        <button
          className="pf-success-back"
          onClick={() => router.push("/profiling/review")}
          aria-label="Back"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="pf-success-topbar-title">KK Profiling</span>
      </div>

      <div className="pf-success-main">
        <h1 className="pf-success-title">Profile Submitted!</h1>
        <Image
          className="pf-success-badge"
          src="/images/Profile Submitted.png"
          alt="Profile submitted"
          width={170}
          height={170}
          priority
        />

        <p className="pf-success-desc">
          Your profiling is complete. To unlock your Digital ID and Rewards,
          please proceed to upload your requirements
        </p>

        <div className="pf-success-btns">
          <button
            className="pf-success-btn-upload"
            onClick={() => router.push("/verification/upload")}
          >
            Upload Requirements
          </button>
          <button
            className="pf-success-btn-home"
            onClick={() => router.push("/home")}
          >
            Go Home
          </button>
        </div>
      </div>

      <FooterBranding dark />
    </div>
  );
}
