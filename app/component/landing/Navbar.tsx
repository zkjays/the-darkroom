"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navLink, setNavLink] = useState({ href: "/darkroom-id", text: "Get ID →" });

  useEffect(() => {
    const handle = localStorage.getItem("darkroom_handle");
    if (handle) {
      setNavLink({ href: "/dashboard", text: "Dashboard →" }); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 50) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-all duration-500 ease-in-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      } ${
        hovered
          ? "bg-[#050508]/60 border-b border-white/10"
          : "bg-transparent border-b border-white/2"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-22">
        <Link href="/" className="transition hover:opacity-90">
          <Image
            src="/THEDR_logo_nobg.svg"
            alt="The Darkroom"
            width={200}
            height={24}
            className="h-auto w-42.5 sm:w-50"
            priority
          />
        </Link>

        <Link
          href={navLink.href}
          className="text-sm text-white/60 transition hover:text-white"
        >
          {navLink.text}
        </Link>
      </div>
    </header>
  );
}
