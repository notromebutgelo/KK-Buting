'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function VerificationSubmittedPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f5f5f5] text-[#014384]">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#7fb3ec_0%,#bdd7f3_20%,#eef5fd_46%,#fff8eb_74%,#f5f5f5_100%)]" />
        <div className="absolute inset-0 bg-white/18 backdrop-blur-[10px]" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-24 pt-10">
          <div className="w-full max-w-[360px] rounded-[28px] bg-white px-7 pb-7 pt-8 text-center shadow-[0_24px_60px_rgba(1,67,132,0.18)]">
            <h1 className="text-[20px] font-extrabold text-[#014384]">
              Documents Submitted!
            </h1>

            <div className="mt-8 flex justify-center">
              <Image
                src="/images/DocumentsSubmitted.png"
                alt="Documents submitted"
                width={128}
                height={128}
                className="h-auto w-[128px] object-contain"
              />
            </div>

            <p className="mx-auto mt-8 max-w-[265px] text-[13px] leading-[1.55] text-[#4f6f9b]">
              Your documents have been successfully uploaded and are now
              waiting for admin verification. After that review is approved,
              your Digital ID will still need the superadmin generation
              step before it appears in the app.
            </p>

            <Link
              href="/scanner/digital-id"
              className="mt-8 inline-flex items-center justify-center text-[22px] font-extrabold italic text-[#014384]"
            >
              Finish
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
