"use client";

/** 首页三个功能模块 icon，使用 currentColor 方便调色 */

export function AccountingIcon({ size = 36, color = "#333" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
         viewBox="0 0 1024 1024" fill="none"
         style={{ display:"block", flexShrink:0 }}>
      <g stroke={color} strokeWidth="34">
        <circle cx="512" cy="512" r="150"/>
        <circle cx="512" cy="512" r="205"/>
      </g>
      <g fill={color}>
        <ellipse cx="485" cy="452" rx="24" ry="34"/>
        <ellipse cx="539" cy="452" rx="24" ry="34"/>
        <ellipse cx="435" cy="492" rx="24" ry="31" transform="rotate(-35 435 492)"/>
        <ellipse cx="589" cy="492" rx="24" ry="31" transform="rotate(35 589 492)"/>
        <path d="M512 494c-44 0-72 54-62 88 7 24 36 10 62 10s55 14 62-10c10-34-18-88-62-88z"/>
      </g>
    </svg>
  );
}

export function RecipeIcon({ size = 36, color = "#333" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
         viewBox="0 0 1024 1024" fill="none"
         style={{ display:"block", flexShrink:0 }}>
      <g stroke={color} strokeWidth="28" strokeLinejoin="round" strokeLinecap="round">
        <path d="M300 402c95-30 165-18 212 36 47-54 117-66 212-36l30 214c-100-22-178-20-242 15-64-35-142-37-242-15z"/>
        <path d="M300 402l-24 2-20 226c108-24 193-21 256 14 63-35 148-38 256-14l-20-226-24-2"/>
        <path d="M512 438v206"/>
        <path d="M666 406c25-35 64-52 92-42 10 30-11 71-48 94-17 10-33 14-48 13 0-19 1-43 4-65z"/>
      </g>
      <g fill={color}>
        <ellipse cx="485" cy="450" rx="21" ry="28"/>
        <ellipse cx="539" cy="450" rx="21" ry="28"/>
        <ellipse cx="447" cy="486" rx="21" ry="26"/>
        <ellipse cx="577" cy="486" rx="21" ry="26"/>
        <path d="M512 492c-39 0-63 47-54 77 6 21 31 9 54 9s48 12 54-9c9-30-15-77-54-77z"/>
      </g>
    </svg>
  );
}

export function HealthIcon({ size = 36, color = "#333" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
         viewBox="0 0 1024 1024" fill="none"
         style={{ display:"block", flexShrink:0 }}>
      <g stroke={color} strokeWidth="30" strokeLinejoin="round" strokeLinecap="round">
        <path d="M512 706C340 592 284 486 322 404c31-67 121-84 190-22 69-62 159-45 190 22 38 82-18 188-190 302z"/>
        <path d="M648 415h38v-38h45v38h38v45h-38v38h-45v-38h-38z"/>
      </g>
      <g fill={color}>
        <ellipse cx="485" cy="455" rx="23" ry="32"/>
        <ellipse cx="539" cy="455" rx="23" ry="32"/>
        <ellipse cx="438" cy="496" rx="23" ry="30" transform="rotate(-28 438 496)"/>
        <ellipse cx="586" cy="496" rx="23" ry="30" transform="rotate(28 586 496)"/>
        <path d="M512 503c-43 0-70 52-60 85 7 23 34 10 60 10s53 13 60-10c10-33-17-85-60-85z"/>
      </g>
    </svg>
  );
}
