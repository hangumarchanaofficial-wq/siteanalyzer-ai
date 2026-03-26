"use client";

import { useEffect, useState } from "react";

interface ScoreRingProps {
    score: number;
    size?: number;
}

export function ScoreRing({ score, size = 100 }: ScoreRingProps) {
    const [animatedScore, setAnimatedScore] = useState(0);
    const strokeWidth = size > 100 ? 8 : 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animatedScore / 100) * circumference;

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedScore(score);
        }, 200);
        return () => clearTimeout(timer);
    }, [score]);

    const getColor = (s: number) => {
        if (s >= 80) return { stroke: "#34d399", text: "text-emerald-400" };
        if (s >= 60) return { stroke: "#fbbf24", text: "text-amber-400" };
        return { stroke: "#f87171", text: "text-red-400" };
    };

    const { stroke, text } = getColor(score);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={strokeWidth}
                />
                {/* Score arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                    style={{
                        filter: `drop-shadow(0 0 6px ${stroke}40)`,
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${text}`}>
          {animatedScore}
        </span>
                {size > 80 && (
                    <span className="text-[10px] text-white/30 mt-0.5">/ 100</span>
                )}
            </div>
        </div>
    );
}
