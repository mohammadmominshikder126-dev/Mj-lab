import React from 'react';

interface BrandLogoProps {
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  siteName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoUrl,
  size = 'md',
  siteName = 'MJ LAB',
}) => {
  const dim =
    size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';

  if (logoUrl) {
    return (
      <div
        className={`${dim} rounded-full overflow-hidden border-2 border-[#22D3EE]/70 shadow-[0_0_16px_rgba(34,211,238,0.28)] bg-[#07152E] shrink-0 flex items-center justify-center`}
      >
        <img
          src={logoUrl}
          alt={siteName}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${dim} rounded-full border-2 border-[#22D3EE] shadow-[0_0_18px_rgba(34,211,238,0.35)] bg-gradient-to-br from-[#0A1F44] to-[#050D1E] shrink-0 flex items-center justify-center relative`}
      aria-label={siteName}
    >
      <svg
        viewBox="0 0 48 48"
        className="w-3/4 h-3/4"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 33V15L17 25L25 15V33"
          stroke="#FFFFFF"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M36 15V27.5C36 30.8 33.8 33 30.5 33C28.6 33 27.2 32.1 26.5 30.8"
          stroke="#22D3EE"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="36" cy="11.5" r="2" fill="#00E676" />
      </svg>
    </div>
  );
};
