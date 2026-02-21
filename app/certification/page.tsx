"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StarsBackground from "@/components/StarsBackground";
import AuthGuard from "@/components/AuthGuard";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe - will be undefined if key is not set
let stripePromise: Promise<any> | null = null;
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface CertificatePayment {
  id: string;
  status: string;
  pdfDownloaded: boolean;
}

export default function CertificationPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<CertificatePayment | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [paymentStatusFetched, setPaymentStatusFetched] = useState(false);

  useEffect(() => {
    fetchUserData();
    (async () => {
      await checkPaymentStatus();
      setPaymentStatusFetched(true);
    })();

    // Check for payment success in URL params
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
              if (urlParams.get("payment") === "success") {
        // Get session ID from URL (Stripe includes it in the success URL)
        const sessionId = urlParams.get("session_id");
        
        console.log("Payment success detected, session_id:", sessionId);
        
        // Refresh payment status after successful payment
        setTimeout(async () => {
          // If we have a session ID, verify payment directly with Stripe API
          if (sessionId) {
            const token = getToken();
            if (token) {
              try {
                console.log("Verifying payment with session ID:", sessionId);
                const verifyResponse = await fetch("/api/certification/verify-payment", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ sessionId }),
                });
                
                if (verifyResponse.ok) {
                  const verifyData = await verifyResponse.json();
                  console.log("Payment verification response:", verifyData);
                  if (verifyData.success && verifyData.payment) {
                    setPaymentStatus(verifyData.payment);
                    // Auto-download PDF after successful payment verification
                    setTimeout(() => {
                      downloadPDF(true);
                    }, 1000);
                    return;
                  }
                } else {
                  const errorData = await verifyResponse.json();
                  console.error("Payment verification failed:", errorData);
                }
              } catch (err) {
                console.error("Error verifying payment:", err);
              }
            }
          }
          
          // Fallback: check payment status from database (in case webhook already processed it)
          console.log("Checking payment status from database...");
          await checkPaymentStatus();
          // After checking payment status, if payment is completed, auto-download PDF
          setTimeout(async () => {
            const token = getToken();
            if (token) {
              const response = await fetch("/api/certification/payment-status", {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (response.ok) {
                const data = await response.json();
                console.log("Payment status from database:", data);
                if (data.payment && data.payment.status === "completed") {
                  // Auto-download PDF after successful payment
                  await downloadPDF(true);
                }
              }
            }
          }, 1500);
        }, 1000);
      }
    }
  }, []);

  // Only paid users can stay on /certification; unpaid users are redirected to payment page
  useEffect(() => {
    if (typeof window === "undefined" || loading || !paymentStatusFetched) return;
    const hasPaid = paymentStatus?.status === "completed";
    if (hasPaid) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment") === "success" && urlParams.get("session_id")) return;
    router.replace("/certification/pay");
  }, [loading, paymentStatusFetched, paymentStatus?.status, router]);

  const getToken = () => {
    if (typeof document === "undefined") return null;
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
  };

  const fetchUserData = async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch("/api/certification/payment-status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentStatus(data.payment ?? null);
      }
    } catch (err) {
      console.error("Error checking payment status:", err);
    }
  };

  const downloadPDF = async (autoDownload = false) => {
    try {
      setDownloading(true);
      const certificateElement = document.getElementById("certificate");
      if (!certificateElement) {
        if (!autoDownload) {
          alert("Certificate not found");
        }
        return;
      }

      // Dynamically import html2canvas and jsPDF only when needed
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // Use html2canvas to capture the certificate
      const canvas = await html2canvas(certificateElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "mm", "a4");
      
      // A4 landscape dimensions: 297mm x 210mm
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Mark as downloaded
      const token = getToken();
      if (token) {
        await fetch("/api/certification/mark-downloaded", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }

      const fileName = `Certificate_${user?.name.replace(/\s+/g, "_")}_${new Date().getFullYear()}.pdf`;
      pdf.save(fileName);
      
      if (autoDownload) {
        console.log("✅ PDF automatically downloaded after payment");
      }
    } catch (err) {
      console.error("Error generating PDF:", err);
      if (!autoDownload) {
        alert("Failed to generate PDF. Please try again.");
      }
    } finally {
      setDownloading(false);
    }
  };

  const hasPaid = paymentStatus?.status === "completed";
  if (loading || !paymentStatusFetched) {
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

  if (!hasPaid) {
    return null;
  }
  const canDownload = hasPaid && !downloading;

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8">
          <div className="w-full max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 md:mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-red-400 mb-4">
                Your Certificate
              </h1>
              <p className="text-gray-300 text-lg md:text-xl">
                Download your official completion certificate
              </p>
            </div>

            {/* Certificate Preview */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 mb-8 overflow-hidden">
              <div id="certificate" className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-8 border-yellow-600 rounded-lg p-12 md:p-16 relative overflow-hidden">
                {/* Decorative Border Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-32 h-32 border-t-4 border-l-4 border-yellow-600"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-yellow-600"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-yellow-600"></div>
                  <div className="absolute bottom-0 right-0 w-32 h-32 border-b-4 border-r-4 border-yellow-600"></div>
                </div>

                {/* Certificate Content */}
                <div className="relative z-10 text-center">
                  {/* Certificate Header */}
                  <div className="mb-8">
                    <div className="inline-block mb-4">
                      <svg className="w-20 h-20 md:w-24 md:h-24 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18L20 8v9c0 4.54-3.07 8.76-8 9.82-4.93-1.06-8-5.28-8-9.82V8l8-3.82z"/>
                        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                      </svg>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-yellow-800 mb-2">
                      Certificate of Completion
                    </h2>
                    <p className="text-lg md:text-xl text-gray-700">
                      Florida Real Estate Course
                    </p>
                  </div>

                  {/* This Certifies */}
                  <div className="my-8 md:my-12">
                    <p className="text-xl md:text-2xl text-gray-700 mb-6">
                      This is to certify that
                    </p>
                    <div className="border-b-4 border-yellow-600 mx-auto max-w-md mb-6">
                      <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 py-4">
                        {user?.name || "Student Name"}
                      </h3>
                    </div>
                    <p className="text-lg md:text-xl text-gray-700 mt-6">
                      has successfully completed the End-of-Course Examination
                    </p>
                    <p className="text-lg md:text-xl text-gray-700">
                      and is hereby awarded this Certificate of Completion
                    </p>
                  </div>

                  {/* Date and Signature Section */}
                  <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <div>
                      <div className="border-t-2 border-gray-400 pt-4 mt-16">
                        <p className="text-gray-600 font-semibold">Date</p>
                        <p className="text-gray-800 text-lg mt-2">
                          {new Date().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div>
                      <div className="border-t-2 border-gray-400 pt-4 mt-16">
                        <p className="text-gray-600 font-semibold">Certificate ID</p>
                        <p className="text-gray-800 text-lg mt-2 font-mono">
                          {user?.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-12 md:mt-16 pt-8 border-t-2 border-gray-300">
                    <p className="text-sm md:text-base text-gray-600">
                      63Hours Real Estate Education
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 mt-2">
                      This certificate verifies successful completion of the required course material and examination.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Download Section - only paid users reach this page */}
            <div className="bg-gradient-to-br from-[#1a1f3a]/95 to-[#0a0e27]/95 backdrop-blur-lg rounded-2xl border-2 border-blue-500/30 shadow-2xl p-6 md:p-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className="inline-block p-4 bg-green-500/20 rounded-full mb-4">
                    <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Your Certificate
                  </h3>
                  <p className="text-gray-300 text-base md:text-lg mb-6">
                    Download your official PDF certificate
                  </p>
                  <button
                    onClick={() => downloadPDF(false)}
                    disabled={!canDownload}
                    className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg md:text-xl rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloading ? "Generating PDF..." : "📥 Download PDF Certificate"}
                  </button>
                  {!paymentStatus?.pdfDownloaded && (
                    <p className="text-sm text-gray-400 mt-2">
                      Your certificate is ready to download anytime
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}

