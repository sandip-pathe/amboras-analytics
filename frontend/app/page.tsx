"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("amboras_token");
    if (token) {
      router.replace("/dashboard");
      return;
    }

    router.replace("/login");
  }, [router]);

  return null;
}
