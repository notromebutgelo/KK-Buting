"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FooterBranding,
  NextArrowButton,
  ProfilingShell,
  getAgeFromBirthday,
  getAgeGroupFromAge,
  readProfilingDraft,
  saveProfilingDraft,
} from "../profiling-ui";

const genderOptions = ["Male", "Female", "Prefer not to say"];

export default function ProfilingStep2() {
  const router = useRouter();
  const [form, setForm] = useState({
    gender: "",
    birthday: "",
    age: "",
    email: "",
    contactNumber: "",
  });

  useEffect(() => {
    const saved = readProfilingDraft();
    setForm({
      gender: saved.gender || "",
      birthday: saved.birthday || "",
      age: saved.age ? String(saved.age) : "",
      email: saved.email || "",
      contactNumber: saved.contactNumber || "",
    });
  }, []);

  const ageGroup = useMemo(() => getAgeGroupFromAge(form.age), [form.age]);
  const isValid =
    form.gender &&
    form.birthday &&
    form.age &&
    form.email &&
    form.contactNumber.length === 11;

  const handleContactNumberChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 11);
    setForm((prev) => ({ ...prev, contactNumber: digitsOnly }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    saveProfilingDraft({
      gender: form.gender,
      birthday: form.birthday,
      age: parseInt(form.age, 10),
      email: form.email,
      contactNumber: form.contactNumber,
      youthAgeGroup: ageGroup,
    });
    router.push("/profiling/step-3");
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={2}
        title="Profile"
        subtitle="Tell us more about yourself."
        onBack={() => router.push("/profiling/step-1")}
        actions={<NextArrowButton disabled={!isValid} />}
      >
        <div className="pf-form-card">
          <div className="pf-row pf-row-2">
            <div className="pf-col">
              <label className="pf-label">
                Gender<span className="req">*</span>
              </label>
              <div className="pf-select-wrap">
                <select
                  className="pf-select"
                  value={form.gender}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, gender: e.target.value }))
                  }
                  required
                >
                  <option value="">Select gender</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pf-col">
              <label className="pf-label">
                Age<span className="req">*</span>
              </label>
              <input
                className="pf-input"
                type="text"
                value={form.age}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    age: e.target.value.replace(/\D/g, "").slice(0, 2),
                  }))
                }
                placeholder="27"
                required
              />
            </div>
          </div>

          <div className="pf-col pf-short-field">
            <label className="pf-label">
              Birthday<span className="req">*</span>
            </label>
            <input
              className="pf-input"
              type="date"
              value={form.birthday}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  birthday: e.target.value,
                  age: getAgeFromBirthday(e.target.value),
                }))
              }
              required
            />
          </div>

          <div className="pf-col">
            <label className="pf-label">
              Email<span className="req">*</span>
            </label>
            <input
              className="pf-input"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="stdwight24@gmail.com"
              required
            />
          </div>

          <div className="pf-col">
            <label className="pf-label">
              Contact Number<span className="req">*</span>
            </label>
            <div className="pf-phone-row">
              <div className="pf-phone-prefix-box">
                <span className="pf-phone-flag" aria-hidden="true">
                  🇵🇭
                </span>
                <span>+63</span>
              </div>
              <input
                className="pf-input"
                type="tel"
                value={form.contactNumber}
                onChange={(e) => handleContactNumberChange(e.target.value)}
                placeholder="9222222222"
                required
              />
            </div>
          </div>
        </div>

        <FooterBranding />
      </ProfilingShell>
    </form>
  );
}
