"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import {
  register,
  signInWithGoogle,
} from "@/services/auth.service";
import { getPostAuthRedirect } from "@/services/profiling.service";
import { useAuthStore } from "@/store/authStore";
import AlertModal from "@/components/ui/AlertModal";
import AuthProgressModal from "@/components/ui/AuthProgressModal";
import { persistYouthSession } from "@/lib/session";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authInProgress = isLoading || googleLoading;
  const authProgressTitle = isLoading
    ? "Creating Your Account"
    : "Continuing with Google";
  const authProgressMessage = isLoading
    ? "Please wait while we create your account and prepare your verification step."
    : "Please wait while we complete your Google sign-in and prepare your KK account.";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, username);
      router.push(`/otp?email=${encodeURIComponent(email)}&next=${encodeURIComponent("/intro")}`);
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { user, token } = await signInWithGoogle();
      await persistYouthSession({ token, maxAgeSeconds: 60 * 60 * 24 * 30 });
      setUser(user);
      setToken(token);
      router.push(await getPostAuthRedirect("/home"));
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="sk-login-root">
      {/* Hero header with background image */}
      <div className="sk-hero">
        <Image
          src="/images/background.png"
          alt=""
          fill
          priority
          style={{ objectFit: "cover", objectPosition: "center top" }}
        />
        <div className="sk-hero-text">
          <h1 className="sk-heading">Register</h1>
          <p className="sk-subheading">Create your account to get started</p>
        </div>
      </div>

      {/* Card */}
      <div className="sk-card">
        <form onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className="sk-field">
            <label htmlFor="username" className="sk-label">
              Username<span className="sk-required">*</span>
            </label>
            <div className="sk-input-wrap">
              <input
                id="username"
                type="text"
                className="sk-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={authInProgress}
                required
                autoComplete="username"
              />
            </div>
          </div>

          {/* Email */}
          <div className="sk-field">
            <label htmlFor="email" className="sk-label">
              Email<span className="sk-required">*</span>
            </label>
            <div className="sk-input-wrap">
              <span className="sk-input-icon">
                <Mail size={16} strokeWidth={1.8} />
              </span>
              <input
                id="email"
                type="email"
                className="sk-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={authInProgress}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="sk-field">
            <label htmlFor="password" className="sk-label">
              Password<span className="sk-required">*</span>
            </label>
            <div className="sk-input-wrap">
              <span className="sk-input-icon">
                <Lock size={16} strokeWidth={1.8} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="sk-input sk-input-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={authInProgress}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="sk-eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                disabled={authInProgress}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="sk-field">
            <label htmlFor="confirmPassword" className="sk-label">
              Confirm Password<span className="sk-required">*</span>
            </label>
            <div className="sk-input-wrap">
              <span className="sk-input-icon">
                <Lock size={16} strokeWidth={1.8} />
              </span>
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                className="sk-input sk-input-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={authInProgress}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="sk-eye-btn"
                onClick={() => setShowConfirm((v) => !v)}
                disabled={authInProgress}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
              </button>
            </div>
          </div>

          {/* Terms note */}
          <p className="sk-terms-text">
            By registering, you agree to our{" "}
            <Link href="/profile/terms" className="sk-terms-link">
              Terms &amp; Conditions
            </Link>
          </p>

          {/* Submit */}
          <button type="submit" className="sk-btn-primary" disabled={authInProgress}>
            {isLoading ? <span className="sk-spinner" /> : "Register"}
          </button>
        </form>

        {/* Login link */}
        <p className="sk-register-text">
          Already have an account?{" "}
          <Link href="/login" className="sk-register-link">
            Login Here
          </Link>
        </p>

        {/* Divider */}
        <div className="sk-divider">
          <span>or continue with</span>
        </div>

        {/* Social buttons */}
        <div className="sk-social-center">
          <button
            type="button"
            className="sk-social-google-btn"
            aria-label="Continue with Google"
            onClick={handleGoogleSignIn}
            disabled={authInProgress}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{googleLoading ? "Connecting Google..." : "Continue with Google"}</span>
          </button>
        </div>

        {/* Branding */}
        <div className="sk-brand">
          <div className="sk-brand-logo">
            <Image src="/images/SKButingLogo.png" alt="SK Barangay Buting logo" width={32} height={32} />
          </div>
          <div className="sk-brand-text">
            <span className="sk-brand-top">SANGGUNIANG KABATAAN</span>
            <span className="sk-brand-bottom">BARANGAY BUTING</span>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={Boolean(error)}
        title="Registration Failed"
        message={error || ""}
        onClose={() => setError(null)}
      />
      <AuthProgressModal
        isOpen={authInProgress}
        title={authProgressTitle}
        message={authProgressMessage}
      />

      <style jsx>{`
        .sk-login-root {
          min-height: 100vh;
          background: #f0f2f5;
          display: flex;
          flex-direction: column;
          font-family: var(--font-body), 'Segoe UI', sans-serif;
        }
        .sk-hero {
          position: relative;
          min-height: 200px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          padding: 0 28px 36px;
        }
        .sk-hero-text {
          position: relative;
          z-index: 1;
        }
        .sk-heading {
          color: #fff;
          font-size: 30px;
          font-weight: 700;
          margin: 0 0 4px;
          letter-spacing: 0.2px;
        }
        .sk-subheading {
          color: rgba(255,255,255,0.82);
          font-size: 14px;
          margin: 0;
          font-weight: 400;
        }
        .sk-card {
          background: #fff;
          border-radius: 28px 28px 0 0;
          margin-top: -20px;
          flex: 1;
          padding: 32px 24px 40px;
          position: relative;
          z-index: 2;
        }
        .sk-field {
          margin-bottom: 18px;
        }
        .sk-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 8px;
        }
        .sk-required {
          color: #e53e3e;
          margin-left: 2px;
        }
        .sk-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .sk-input-icon {
          position: absolute;
          left: 14px;
          color: #6b7280;
          display: flex;
          align-items: center;
          pointer-events: none;
        }
        .sk-input {
          width: 100%;
          border: 1.5px solid #e2e8f0;
          border-radius: 50px;
          padding: 13px 16px 13px 42px;
          font-size: 14px;
          color: #1a1a2e;
          background: #fff;
          outline: none;
          transition: border-color 0.18s;
          box-sizing: border-box;
        }
        .sk-input::placeholder {
          color: #b0b8c9;
        }
        .sk-input:focus {
          border-color: #1e4d8c;
          box-shadow: 0 0 0 3px rgba(30,77,140,0.10);
        }
        .sk-input-password {
          padding-right: 44px;
        }
        .sk-eye-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
          padding: 4px;
        }
        .sk-eye-btn:hover {
          color: #1e4d8c;
        }
        .sk-eye-btn:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
        .sk-terms-text {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 20px;
          text-align: center;
        }
        .sk-terms-link {
          color: #1e4d8c;
          font-weight: 700;
          text-decoration: none;
        }
        .sk-terms-link:hover {
          text-decoration: underline;
        }
        .sk-btn-primary {
          width: 100%;
          background: #1e4d8c;
          color: #fff;
          border: none;
          border-radius: 50px;
          padding: 15px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
        }
        .sk-btn-primary:hover:not(:disabled) {
          background: #163e76;
        }
        .sk-btn-primary:active:not(:disabled) {
          transform: scale(0.98);
        }
        .sk-btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .sk-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: sk-spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes sk-spin {
          to { transform: rotate(360deg); }
        }
        .sk-register-text {
          text-align: center;
          font-size: 13px;
          color: #4a5568;
          margin: 18px 0 20px;
        }
        .sk-register-link {
          color: #1e4d8c;
          font-weight: 700;
          text-decoration: none;
        }
        .sk-register-link:hover {
          text-decoration: underline;
        }
        .sk-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #1e4d8c;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .sk-divider::before,
        .sk-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #1e4d8c;
        }
        .sk-social-center {
          display: flex;
          justify-content: center;
          margin-bottom: 32px;
        }
        .sk-social-google-btn {
          min-width: 220px;
          max-width: 100%;
          min-height: 52px;
          border-radius: 999px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 22px;
          color: #1a1a2e;
          font-size: 14px;
          font-weight: 600;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .sk-social-google-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .sk-social-google-btn:hover {
          border-color: #1e4d8c;
          box-shadow: 0 2px 8px rgba(30,77,140,0.12);
        }
        .sk-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .sk-brand-logo {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: #f0f2f5;
        }
        .sk-brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        .sk-brand-top {
          font-size: 9px;
          color: #6b7280;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .sk-brand-bottom {
          font-size: 11px;
          color: #1e4d8c;
          font-weight: 800;
          letter-spacing: 0.3px;
        }
      `}</style>
    </div>
  );
}
