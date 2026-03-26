"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, TrendingUp, Globe2 } from "lucide-react";
import { BenchmarkStatCard } from "./BenchmarkStatCard";
import { PerformanceTrendsChart } from "./PerformanceTrendsChart";
import { CommonIssuesChart } from "./CommonIssuesChart";
import { HealthDistributionChart } from "./HealthDistributionChart";
import { benchmarkStats } from "@/lib/benchmark-data";

export function IndustryBenchmarks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 sm:py-28"
    >
      {/* Section background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-accent-blue/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-accent-violet/[0.04] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-6">
            <BarChart3 className="w-3.5 h-3.5 text-accent-blue" />
            <span className="text-[11px] text-white/50 font-medium tracking-wide">
              Aggregated Intelligence
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Industry Benchmark{" "}
            <span className="text-gradient-accent">Insights</span>
          </h2>
          <p className="text-base text-white/35 max-w-lg mx-auto leading-relaxed">
            Aggregated insights from thousands of analyzed webpages — see how the
            web performs before you audit your own.
          </p>
        </div>

        {/* Stat Cards */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transition-all duration-700 delay-150 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          {benchmarkStats.map((stat, i) => (
            <BenchmarkStatCard key={stat.id} stat={stat} index={i} />
          ))}
        </div>

        {/* Main Chart - Full Width */}
        <div
          className={`mb-6 transition-all duration-700 delay-300 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <PerformanceTrendsChart />
        </div>

        {/* Secondary Charts - Side by Side */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-5 gap-6 transition-all duration-700 delay-[450ms] ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <div className="lg:col-span-3">
            <CommonIssuesChart />
          </div>
          <div className="lg:col-span-2">
            <HealthDistributionChart />
          </div>
        </div>

        {/* Bottom context note */}
        <div
          className={`mt-10 flex items-center justify-center gap-3 transition-all duration-700 delay-[600ms] ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-white/[0.06]" />
          <div className="flex items-center gap-2 text-white/20">
            <Globe2 className="w-3.5 h-3.5" />
            <span className="text-[11px] tracking-wide">
              Based on 12,847 pages analyzed across 2,340 domains
            </span>
          </div>
          <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-white/[0.06]" />
        </div>
      </div>
    </section>
  );
}
