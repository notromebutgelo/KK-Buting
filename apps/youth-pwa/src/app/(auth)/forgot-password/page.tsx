'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'
import { resetPassword } from '@/services/auth.service'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await resetPassword(email)
      setSent(true)
    } catch {
      setError('Failed to send reset email. Please check the email address.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="sk-forgot-root">
      <div className="sk-forgot-header">
        <button
          type="button"
          className="sk-forgot-back"
          onClick={() => router.push('/login')}
          aria-label="Back"
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="sk-forgot-header-title">Reset Password</h1>
      </div>

      <div className="sk-forgot-hero">
        <Image
          src="/images/background.png"
          alt=""
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />
        <div className="sk-forgot-hero-copy">
          <h2 className="sk-forgot-title">Forgot Your Password?</h2>
          <p className="sk-forgot-subtitle">
            Enter your email address and we&apos;ll send you a code to reset your password.
          </p>
        </div>
      </div>

      <div className="sk-forgot-card">
        {sent ? (
          <div className="sk-forgot-success">
            <div className="sk-forgot-success-icon">
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="sk-forgot-success-title">Email Sent!</h3>
            <p className="sk-forgot-success-copy">
              Check your inbox for the password reset link.
            </p>
            <Link href="/login" className="sk-forgot-login-link">
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            {error ? (
              <div className="sk-forgot-error" role="alert">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} noValidate>
              <div className="sk-forgot-field">
                <label htmlFor="email" className="sk-forgot-label">
                  Email
                </label>
                <div className="sk-forgot-input-wrap">
                  <span className="sk-forgot-input-icon">
                    <Mail size={16} strokeWidth={1.9} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    className="sk-forgot-input"
                    placeholder="stdwight24@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="sk-forgot-btn"
                disabled={isLoading}
              >
                {isLoading ? <span className="sk-forgot-spinner" /> : 'Send Code'}
              </button>
            </form>

            <p className="sk-forgot-footer-text">
              Remember password?{' '}
              <Link href="/login" className="sk-forgot-footer-link">
                Login
              </Link>
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        .sk-forgot-root {
          min-height: 100vh;
          background: #f2f3f7;
          display: flex;
          flex-direction: column;
          font-family: var(--font-body), 'Segoe UI', sans-serif;
        }

        .sk-forgot-header {
          position: relative;
          z-index: 2;
          background: rgba(255, 255, 255, 0.98);
          border-bottom-right-radius: 36px;
          padding: 22px 20px 24px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 8px 24px rgba(15, 79, 152, 0.08);
        }

        .sk-forgot-back {
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          color: #0f4f98;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          flex-shrink: 0;
          cursor: pointer;
        }

        .sk-forgot-header-title {
          margin: 0;
          color: #0f4f98;
          font-family: var(--font-display);
          font-size: 1.8rem;
          font-weight: 800;
          line-height: 1.1;
        }

        .sk-forgot-hero {
          position: relative;
          min-height: 190px;
          margin-top: -8px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          padding: 0 18px 30px;
        }

        .sk-forgot-hero-copy {
          position: relative;
          z-index: 1;
          max-width: 290px;
        }

        .sk-forgot-title {
          margin: 0 0 8px;
          color: #ffffff;
          font-family: var(--font-display);
          font-size: 2.1rem;
          line-height: 1.08;
          font-weight: 800;
        }

        .sk-forgot-subtitle {
          margin: 0;
          color: rgba(255, 255, 255, 0.94);
          font-size: 1rem;
          line-height: 1.5;
          font-weight: 500;
        }

        .sk-forgot-card {
          background: #ffffff;
          border-radius: 34px 34px 0 0;
          margin-top: -14px;
          flex: 1;
          padding: 32px 18px 40px;
          position: relative;
          z-index: 2;
        }

        .sk-forgot-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .sk-forgot-field {
          margin-bottom: 22px;
        }

        .sk-forgot-label {
          display: block;
          margin-bottom: 9px;
          color: #0f4f98;
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
        }

        .sk-forgot-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .sk-forgot-input-icon {
          position: absolute;
          left: 18px;
          color: #0f4f98;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .sk-forgot-input {
          width: 100%;
          min-height: 54px;
          border: 1.7px solid #0f4f98;
          border-radius: 999px;
          padding: 0 18px 0 46px;
          font-size: 14px;
          color: #0f4f98;
          background: #f8fbff;
          outline: none;
          transition: box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .sk-forgot-input:focus {
          box-shadow: 0 0 0 3px rgba(15, 79, 152, 0.12);
        }

        .sk-forgot-input::placeholder {
          color: rgba(15, 79, 152, 0.7);
        }

        .sk-forgot-btn {
          width: 100%;
          min-height: 56px;
          border: none;
          border-radius: 999px;
          background: #014384;
          color: #ffffff;
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.12s ease, filter 0.16s ease;
        }

        .sk-forgot-btn:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .sk-forgot-btn:active:not(:disabled) {
          transform: scale(0.985);
        }

        .sk-forgot-btn:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }

        .sk-forgot-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: sk-forgot-spin 0.7s linear infinite;
          display: inline-block;
        }

        .sk-forgot-footer-text {
          margin: 22px 0 0;
          text-align: center;
          color: #6e7c93;
          font-size: 0.92rem;
        }

        .sk-forgot-footer-link,
        .sk-forgot-login-link {
          color: #014384;
          font-weight: 700;
          text-decoration: none;
        }

        .sk-forgot-success {
          padding: 10px 6px 0;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .sk-forgot-success-icon {
          width: 62px;
          height: 62px;
          border-radius: 50%;
          background: #eaf6ee;
          color: #1d8a43;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .sk-forgot-success-title {
          margin: 0 0 8px;
          color: #014384;
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 800;
        }

        .sk-forgot-success-copy {
          margin: 0 0 18px;
          color: #58708f;
          font-size: 0.96rem;
          line-height: 1.55;
          max-width: 270px;
        }

        @keyframes sk-forgot-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
