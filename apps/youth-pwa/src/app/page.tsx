"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const BRAND_SEAL = "/images/SKButingLogo.png";

const SLIDES = [
  {
    title: "Join the KK Buting Community",
    description:
      "Get officially recognized as a youth member of Barangay Buting.",
    image: "/images/Carousel1.png",
  },
  {
    title: "Get Your Digital KK ID",
    description:
      "Upload your documents and become a verified member. Once validated and issued by the superadmin, your Digital ID appears in the app.",
    image: "/images/Carousel2.png",
  },
  {
    title: "Earn Points and Rewards",
    description:
      "Scan QR codes at partner merchants to earn points. Redeem your points for exciting rewards like food, shopping, and more.",
    image: "/images/Carousel3.png",
  },
] as const;

const SPLASH_DURATION = 2200;

type Phase = "splash" | "onboarding";

export default function SplashOnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("splash");
  const [splashExit, setSplashExit] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDir, setSlideDir] = useState<"left" | "right">("left");
  const [animating, setAnimating] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const exitTimer = setTimeout(() => setSplashExit(true), SPLASH_DURATION - 400);
    const phaseTimer = setTimeout(() => setPhase("onboarding"), SPLASH_DURATION);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(phaseTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "onboarding" || animating) return;

    const autoSlideTimer = setTimeout(() => {
      goToSlide((currentSlide + 1) % SLIDES.length);
    }, 5000);

    return () => clearTimeout(autoSlideTimer);
  }, [phase, currentSlide, animating]);

  const goToSlide = (index: number) => {
    if (animating || index === currentSlide) return;

    setSlideDir(index > currentSlide ? "left" : "right");
    setAnimating(true);

    setTimeout(() => {
      setCurrentSlide(index);
      setAnimating(false);
    }, 320);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const delta = touchStartX.current - e.changedTouches[0].clientX;

    if (Math.abs(delta) > 40) {
      if (delta > 0 && currentSlide < SLIDES.length - 1) goToSlide(currentSlide + 1);
      if (delta < 0 && currentSlide > 0) goToSlide(currentSlide - 1);
    }

    touchStartX.current = null;
  };

  const slide = SLIDES[currentSlide];

  return (
    <>
      {phase === "splash" ? (
      <div
        className="splash-screen"
        data-exit={splashExit}
        aria-label="KKB App Buting splash screen"
      >
        <div className="splash-content">
          <Image
            src={BRAND_SEAL}
            alt="Sangguniang Kabataan Barangay Buting seal"
            className="splash-seal"
            width={160}
            height={160}
            priority
          />
        </div>
      </div>
      ) : null}

    <div
      className="onboarding-screen"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="app-purpose-header">
        <Image
          src={BRAND_SEAL}
          alt="Sangguniang Kabataan Barangay Buting seal"
          className="app-purpose-seal"
          width={58}
          height={58}
          priority
        />
        <div className="app-purpose-copy">
          <p className="app-purpose-kicker">Official youth portal</p>
          <h1 className="app-purpose-title">KKB App Buting</h1>
          <p className="app-purpose-text">
            KKB App Buting helps Barangay Buting youth register for KK profiling,
            complete verification, access their digital ID, earn points, and redeem
            rewards from participating merchants.
          </p>
        </div>
      </header>

      <div
        className="slide-area"
        data-animating={animating}
        data-dir={slideDir}
      >
        <div className="slide-text">
          <h2 className="slide-title">{slide.title}</h2>
          <p className="slide-desc">{slide.description}</p>
        </div>

        <div className="slide-media-stack">
          <div className="slide-carousel-shell">
            <div className="slide-image-card">
              <div className="slide-image-wrap">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  className="slide-image"
                  fill
                  sizes="(max-width: 480px) 88vw, 380px"
                  priority={currentSlide === 0}
                />
              </div>
            </div>
          </div>

          <div className="slide-dots" role="tablist" aria-label="Onboarding slides">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === currentSlide}
                aria-label={`Slide ${i + 1}`}
                className="slide-dot"
                data-active={i === currentSlide}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="cta-area">
        <button
          className="btn-login"
          onClick={() => router.push("/login")}
          aria-label="Go to login"
        >
          Login
        </button>
        <button
          className="btn-register"
          onClick={() => router.push("/register")}
          aria-label="Go to register"
        >
          Register
        </button>
      </div>

      <div className="onboarding-footer">
        <Image
          src={BRAND_SEAL}
          alt=""
          className="footer-seal"
          aria-hidden="true"
          width={28}
          height={28}
        />
        <div className="footer-text">
          <span className="footer-org">Sangguniang Kabataan</span>
          <span className="footer-barangay">Barangay Buting</span>
        </div>
      </div>
    </div>
    </>
  );
}
