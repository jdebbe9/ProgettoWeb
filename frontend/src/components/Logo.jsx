import * as React from 'react';


const Logo = React.forwardRef(function Logo(
  {
    variant = 'wordmark',
    size = 40,
    strokeWidth = 1.9,
    label = 'Le radici di sè',
    labelWeight = 600,
    labelScale = 0.9,
    color,
    decorative = false,
    style,
    ...props
  },
  ref
) {
  const stroke = color ? { stroke: color } : { stroke: 'currentColor' };
  const titleId = React.useId();

  const Icon = (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : titleId}
      style={style}
      shapeRendering="geometricPrecision"
      {...props}
    >
      {!decorative && <title id={titleId}>{label}</title>}
      <g fill="none" {...stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
       
        <circle cx="12" cy="12" r="10" />
       
        <circle cx="12" cy="9" r="3.2" />
        
        <path d="M5.5 19c.7-3 3.9-5 6.5-5s5.8 2 6.5 5" />
        
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
      {React.cloneElement(Icon, { decorative: true })}
      <span
        style={{
          fontWeight: labelWeight,
          letterSpacing: '.1px',
          fontSize: Math.round(size * labelScale),
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </span>
    </span>
  );
});

export default Logo;
