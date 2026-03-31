'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfilingResumePath } from '../profiling/profiling-ui'

export default function IntroPage() {
  const router = useRouter()
  const [resumePath, setResumePath] = useState('/profiling/step-1')

  useEffect(() => {
    setResumePath(getProfilingResumePath())
  }, [])

  return (
    <div className="kk-intro-page">
      <Image
        src="/images/KK_Profiling_Introduction.png"
        alt=""
        fill
        priority
        className="kk-intro-bg"
        sizes="100vw"
      />

      <div className="kk-intro-overlay">
        <div className="kk-intro-card">
          <h1 className="kk-intro-title">What is KK Profiling?</h1>
          <p className="kk-intro-copy">
            The Katipunan ng Kabataan (KK) Profiling is an official initiative to gather
            demographic data and understand the needs of youth aged 15 to 30. By securely
            completing your profile, you help your local Sangguniang Kabataan (SK) and
            government create data-driven programs, policies, and projects that directly
            benefit you and your community.
          </p>

          <div className="kk-intro-actions">
            <button
              type="button"
              className="kk-intro-btn kk-intro-btn-secondary"
              onClick={() => router.push('/')}
            >
              Go back
            </button>
            <button
              type="button"
              className="kk-intro-btn kk-intro-btn-primary"
              onClick={() => router.push(resumePath)}
            >
              {resumePath === '/profiling/step-1' ? 'Start' : 'Continue'}
            </button>
          </div>

          <p className="kk-intro-note">
            Rest assured that all information gathered from this study will be treated with utmost confidentiality.
          </p>
        </div>
      </div>

      <style jsx>{`
        .kk-intro-page {
          position: relative;
          min-height: 100dvh;
          overflow: hidden;
          display: flex;
          align-items: stretch;
          justify-content: center;
          background: #1451a6;
        }

        .kk-intro-bg {
          object-fit: cover;
          object-position: center;
          z-index: 0;
        }

        .kk-intro-overlay {
          position: relative;
          z-index: 1;
          min-height: 100dvh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 106px 0 100px;
        }

        .kk-intro-card {
          width: calc(100% - 24px);
          max-width: 420px;
          background: rgba(255, 255, 255, 0.96);
          border-radius: 34px;
          box-shadow: 0 24px 48px rgba(10, 51, 110, 0.26);
          padding: 48px 28px 34px;
          text-align: center;
          backdrop-filter: blur(2px);
        }

        .kk-intro-title {
          margin: 0 0 24px;
          color: #0f4f98;
          font-family: var(--font-display);
          font-size: 2rem;
          line-height: 1.12;
          font-weight: 900;
        }

        .kk-intro-copy {
          margin: 0;
          color: #11539f;
          font-family: var(--font-body);
          font-size: 1.05rem;
          line-height: 1.65;
          font-weight: 600;
        }

        .kk-intro-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 34px;
        }

        .kk-intro-btn {
          border: none;
          border-radius: 999px;
          min-height: 54px;
          padding: 0 20px;
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s ease, filter 0.15s ease;
        }

        .kk-intro-btn:hover {
          filter: brightness(1.04);
        }

        .kk-intro-btn:active {
          transform: scale(0.98);
        }

        .kk-intro-btn-primary,
        .kk-intro-btn-secondary {
          background: linear-gradient(180deg, #ffc73a 0%, #f5a623 100%);
          color: #ffffff;
          box-shadow: 0 12px 24px rgba(245, 166, 35, 0.22);
        }

        .kk-intro-note {
          margin: 26px 0 0;
          color: #e45757;
          font-family: var(--font-body);
          font-size: 0.8rem;
          line-height: 1.55;
          font-style: italic;
          font-weight: 500;
        }

        @media (max-width: 390px) {
          .kk-intro-overlay {
            padding: 92px 0 88px;
          }

          .kk-intro-card {
            width: calc(100% - 16px);
            padding: 40px 20px 28px;
            border-radius: 28px;
          }

          .kk-intro-title {
            font-size: 1.7rem;
          }

          .kk-intro-copy {
            font-size: 0.96rem;
          }

          .kk-intro-actions {
            gap: 12px;
          }

          .kk-intro-btn {
            min-height: 50px;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  )
}
