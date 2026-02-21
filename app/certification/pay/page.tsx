"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StarsBackground from "@/components/StarsBackground";
import AuthGuard from "@/components/AuthGuard";

export default function CertificationPayPage() {
  const router = useRouter();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [checking, setChecking] = useState(true);

  const getToken = () => {
    if (typeof document === "undefined") return null;
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
  };

  useEffect(() => {
    const check = async () => {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const response = await fetch("/api/certification/payment-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.payment?.status === "completed") {
            setAlreadyPaid(true);
            router.replace("/certification");
            return;
          }
        }
      } catch (_) {}
      setChecking(false);
    };
    check();
  }, [router]);

  const handlePayment = async () => {
    try {
      setProcessingPayment(true);
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const response = await fetch("/api/certification/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
          return;
        }
      }
      const error = await response.json().catch(() => ({}));
      alert(error.message || "Failed to create payment session");
    } catch (err) {
      console.error("Error initiating payment:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (checking || alreadyPaid) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
          <Header />
          <StarsBackground />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-white text-xl">Loading...</div>
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8">
          <div className="w-full max-w-lg mx-auto">
            <div className="bg-gradient-to-br from-[#1a1f3a]/95 to-[#0a0e27]/95 backdrop-blur-lg rounded-2xl border-2 border-yellow-500/30 shadow-2xl p-6 md:p-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className="inline-block p-4 bg-yellow-500/20 rounded-full mb-4">
                    <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Certificate Payment
                  </h1>
                  <p className="text-gray-300 text-base md:text-lg mb-4">
                    Pay $200 to receive your Certificate of Completion
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    After payment you will be able to view and download your official certificate.
                  </p>
                  <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4 mb-6">
                    <p className="text-blue-200 text-sm md:text-base">
                      <span className="font-semibold">Included:</span> Official PDF certificate, verification, lifetime access
                    </p>
                  </div>
                  <button
                    onClick={handlePayment}
                    disabled={processingPayment}
                    className="w-full py-4 px-6 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingPayment ? "Processing..." : "Pay $200"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
