"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { signIn, signInWithFacebook, signInWithGoogle } from "@/services/auth.service";
import { getPostAuthRedirect } from "@/services/profiling.service";
import { useAuthStore } from "@/store/authStore";
import AlertModal from "@/components/ui/AlertModal";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { user, token } = await signIn(email, password);
      setUser(user);
      setToken(token);

      // Set auth-token cookie for middleware
      document.cookie = `auth-token=${token}; path=/; max-age=${rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24}`;

      const requestedRedirect = searchParams.get("redirect") || "/home";
      const redirect = await getPostAuthRedirect(requestedRedirect);
      router.push(redirect);
    } catch (err: any) {
      if (err?.message === "EMAIL_NOT_VERIFIED") {
        router.push(`/otp?email=${encodeURIComponent(email)}&next=${encodeURIComponent("/home")}`);
        return;
      }

      const rawMessage = String(err?.message || "");
      const friendlyMessage =
        rawMessage.includes("auth/invalid-credential") ||
        rawMessage.includes("auth/wrong-password") ||
        rawMessage.includes("auth/user-not-found")
          ? "Invalid email or password."
          : rawMessage || "Login failed. Please try again.";

      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { user, token } = await signInWithGoogle();
      setUser(user);
      setToken(token);
      document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 30}`;
      router.push(await getPostAuthRedirect("/home"));
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setError(null);
    setFacebookLoading(true);

    try {
      const { user, token } = await signInWithFacebook();
      setUser(user);
      setToken(token);
      document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 30}`;
      router.push(await getPostAuthRedirect("/home"));
    } catch (err: any) {
      setError(err?.message || "Facebook sign-in failed. Please try again.");
    } finally {
      setFacebookLoading(false);
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
          <h1 className="sk-heading">Login</h1>
          <p className="sk-subheading">Welcome Back, Enter your details</p>
        </div>
      </div>

      {/* Card */}
      <div className="sk-card">
        <form onSubmit={handleSubmit} noValidate>
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
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="sk-eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
              </button>
            </div>
          </div>

          {/* Remember me + Forgot */}
          <div className="sk-row">
            <label className="sk-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember Me</span>
            </label>
            <Link href="/forgot-password" className="sk-forgot">
              Forgot Password?
            </Link>
          </div>

          {/* Submit */}
          <button type="submit" className="sk-btn-primary" disabled={isLoading}>
            {isLoading ? <span className="sk-spinner" /> : "Login"}
          </button>
        </form>

        {/* Register link */}
        <p className="sk-register-text">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="sk-register-link">
            Register Here
          </Link>
        </p>

        {/* Divider */}
        <div className="sk-divider">
          <span>or continue with</span>
        </div>

        {/* Social buttons */}
        <div className="sk-social-row">
          <button
            type="button"
            className="sk-social-btn"
            aria-label="Continue with Google"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || facebookLoading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </button>
          <button
            type="button"
            className="sk-social-btn"
            aria-label="Continue with Facebook"
            onClick={handleFacebookSignIn}
            disabled={facebookLoading || googleLoading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
          <button type="button" className="sk-social-btn" aria-label="Continue with Apple">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#000" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
            </svg>
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
        title="Login Failed"
        message={error || ""}
        onClose={() => setError(null)}
      />

      <style jsx>{`
        /* ---- Root & layout ---- */
        .sk-login-root {
          min-height: 100vh;
          background: #f0f2f5;
          display: flex;
          flex-direction: column;
          font-family: var(--font-body), 'Segoe UI', sans-serif;
        }

        /* ---- Hero ---- */
        .sk-hero {
          position: relative;
          min-height: 220px;
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

        /* ---- Card ---- */
        .sk-card {
          background: #fff;
          border-radius: 28px 28px 0 0;
          margin-top: -20px;
          flex: 1;
          padding: 32px 24px 40px;
          position: relative;
          z-index: 2;
        }

        /* ---- Fields ---- */
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

        /* ---- Row: remember + forgot ---- */
        .sk-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .sk-remember {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          color: #4a5568;
          cursor: pointer;
        }
        .sk-remember input[type="checkbox"] {
          accent-color: #1e4d8c;
          width: 15px;
          height: 15px;
          cursor: pointer;
        }
        .sk-forgot {
          font-size: 13px;
          color: #4a5568;
          text-decoration: none;
        }
        .sk-forgot:hover {
          color: #1e4d8c;
          text-decoration: underline;
        }

        /* ---- Primary button ---- */
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

        /* ---- Spinner ---- */
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

        /* ---- Register link ---- */
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

        /* ---- Divider ---- */
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

        /* ---- Social ---- */
        .sk-social-row {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 32px;
        }
        .sk-social-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .sk-social-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .sk-social-btn:hover {
          border-color: #1e4d8c;
          box-shadow: 0 2px 8px rgba(30,77,140,0.12);
        }

        /* ---- Branding ---- */
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
