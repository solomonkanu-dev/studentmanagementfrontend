"use client";

import { useId } from "react";

interface LogoIconProps {
  size?: number;
  className?: string;
}

/**
 * EduSalone scholar-cap mark. Inline SVG with per-instance gradient IDs
 * so multiple <LogoIcon /> can render on the same page without conflict.
 */
export function LogoIcon({ size = 32, className }: LogoIconProps) {
  const id = useId().replace(/[:]/g, "");
  const bg = `bg-${id}`;
  const boardR = `boardR-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="EduSalone"
      className={className}
    >
      <defs>
        <linearGradient
          id={bg}
          x1="0"
          y1="0"
          x2="240"
          y2="240"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#0A2647" />
        </linearGradient>
        <linearGradient
          id={boardR}
          x1="120"
          y1="78"
          x2="184"
          y2="148"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#BFE2FF" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="54" fill={`url(#${bg})`} />
      <path
        d="M88 138 Q120 156 152 138 L152 152 Q120 170 88 152 Z"
        fill="#0A2647"
        fillOpacity="0.55"
      />
      <path d="M120 78 L56 112 L120 146 Z" fill="#BFE2FF" />
      <path d="M120 78 L184 112 L120 146 Z" fill={`url(#${boardR})`} />
      <line
        x1="120"
        y1="78"
        x2="120"
        y2="146"
        stroke="#2563EB"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M120 112 C152 107 178 109 178 120 L178 150"
        stroke="#7DD3FC"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="178" cy="151" r="6" fill="#7DD3FC" />
      <path
        d="M174.8 155 H181.2 L179.4 171 Q178 174 176.6 171 Z"
        fill="#7DD3FC"
      />
      <circle cx="120" cy="112" r="8" fill="#0A2647" />
      <circle cx="120" cy="112" r="3.4" fill="#FFFFFF" />
    </svg>
  );
}
