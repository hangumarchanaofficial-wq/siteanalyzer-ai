"use client";

export function Navbar() {
    return (
        <nav className="sticky top-0 z-50 glass-strong border-b border-white/[0.05]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-20 items-center justify-center">
                    <span className="text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                        Lunaria
                    </span>
                </div>
            </div>
        </nav>
    );
}
