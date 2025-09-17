// src/components/Logo.jsx
import * as React from 'react';

/**
 * Logo Le radici di sè — "testa + groviglio" dentro un badge circolare.
 * Pensato per rendere bene anche a 24–40px.
 *
 * Props:
 * - variant: 'icon' | 'wordmark'
 * - size: altezza icona in px (default 40)
 * - strokeWidth: spessore linee (default 1.9 per viewBox 24)
 * - label: testo (default "Le radici di sè")
 * - labelWeight: peso font (default 500)
 * - labelScale: fattore rispetto all’icona per la dimensione del testo (default 0.9)
 * - color: opzionale (se non passato usa currentColor)
 */
export default function Logo({
  variant = 'wordmark',
  size = 40,
  strokeWidth = 1.9,
  label = 'Le radici di sè',
  labelWeight = 500,
  labelScale = 0.9,
  color,
  style,
  ...props
}) {
  const stroke = color ? { stroke: color } : { stroke: 'currentColor' };

  const Icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="PsicoCare"
      style={style}
      {...props}
    >
      <g fill="none" {...stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* Badge */}
        <circle cx="12" cy="12" r="10" />
        {/* Testa (volto) */}
        <circle cx="12" cy="9" r="3.2" />
        {/* Spalle */}
        <path d="M5.5 19c.7-3 3.9-5 6.5-5s5.8 2 6.5 5" />
        {/* Groviglio cervello (semplice e leggibile) */}
        <path d="M10.2 8.6c1-.8 2.6-.6 3.4.3.8.9.7 2.3-.3 3.1-.9.7-2.2.7-3.1 0-.6-.5-.6-1.6 0-2.3" />
      </g>
    </svg>
  );

  if (variant === 'icon') return Icon;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        lineHeight: 1,
        color: color || 'inherit',
        ...style
      }}
    >
      {Icon}
      <span
        style={{
          fontWeight: labelWeight,      // più leggero del 700
          letterSpacing: '.1px',
          fontSize: Math.round(size * labelScale),
        }}
      >
        {label}
      </span>
    </span>
  );
}
