"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const SKIP_REDIRECT_PATHS = [
  "/certification/pay",
  "/certification",
  "/login",
  "/signup",
  "/admin",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/unverified",
  "/signup-success",
];

function shouldSkipRedirect(pathname: string): boolean {
  if (!pathname) return true;
  if (SKIP_REDIRECT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (pathname.startsWith("/admin")) return true;
  return false;
}

export default function CertificationPayRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (shouldSkipRedirect(pathname)) return;

    const token =
      typeof document !== "undefined"
        ? document.cookie
            .split("; ")
            .find((row) => row.startsWith("auth-token="))
            ?.split("=")[1]
        : null;
    if (!token) return;

    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.needsCertificationPay) return;
        if (shouldSkipRedirect(window.location.pathname)) return;
        router.replace("/certification/pay");
      })
      .catch(() => {});
  }, [pathname, router]);

  return null;
}
