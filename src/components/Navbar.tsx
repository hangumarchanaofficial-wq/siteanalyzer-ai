"use client";

import { useState } from "react";
import { Github, Menu, X, Moon, Sun } from "lucide-react";

export function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isDark, setIsDark] = useState(true);

    return (
        <nav className="sticky top-0 z-50 glass-strong border-b border-white/[0.05]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center">
                                <span className="text-black text-sm font-bold">S</span>
                            </div>
                            <div className="absolute -inset-1 rounded-xl opacity-20 blur-sm -z-10 bg-[radial-gradient(circle,rgba(167,239,255,0.35),transparent_70%)]" />
                        </div>
                        <span className="text-[15px] font-semibold tracking-tight text-white">
              SiteInsight AI
            </span>
                    </div>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-1">
                        {["Docs", "GitHub", "Pricing"].map((item) => (
                            <a
                                key={item}
                                href="#"
                                className="px-3.5 py-2 text-[13px] text-white/50 hover:text-white/90 rounded-lg hover:bg-white/[0.04] transition-all duration-200"
                            >
                                {item}
                            </a>
                        ))}
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-2">
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-200"
                        >
                            <Github className="w-[18px] h-[18px]" />
                        </a>

                        <button
                            onClick={() => setIsDark(!isDark)}
                            className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-200"
                        >
                            {isDark ? (
                                <Moon className="w-[18px] h-[18px]" />
                            ) : (
                                <Sun className="w-[18px] h-[18px]" />
                            )}
                        </button>

                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center ml-1">
                            <span className="text-[11px] font-medium text-white/70">JD</span>
                        </div>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-all"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-border-subtle animate-fade-in">
                    <div className="px-4 py-3 space-y-1">
                        {["Docs", "GitHub", "Pricing"].map((item) => (
                            <a
                                key={item}
                                href="#"
                                className="block px-3 py-2.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/[0.04] transition-all"
                            >
                                {item}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
}
