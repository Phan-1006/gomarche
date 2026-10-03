import React from 'react';
import { METHOD_TO_GATEWAY, PaymentGatewayConfig, PaymentMethod } from '../types';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  customLogoUrl?: string;
}

export const AirtelMoneyLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  customLogoUrl,
}) => {
  const sizeClasses = {
    sm: 'h-6 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-12 text-base',
  }[size];

  const imgHeightClass = {
    sm: 'h-5 max-w-[80px]',
    md: 'h-7 max-w-[110px]',
    lg: 'h-9 max-w-[140px]',
  }[size];

  if (customLogoUrl) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-gray-200 shadow-xs ${className}`}>
        <img
          src={customLogoUrl}
          alt="Airtel Money"
          className={`${imgHeightClass} object-contain`}
          onError={(e) => {
            // fallback if custom logo broken
            e.currentTarget.style.display = 'none';
          }}
        />
        {showText && <span className="text-xs font-bold text-gray-800">Airtel Money</span>}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md font-bold text-white shadow-xs ${sizeClasses} ${className}`}
      style={{ backgroundColor: '#E40000' }}
    >
      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[#E40000] font-black text-xs">
        a
      </div>
      {showText && <span>airtel money</span>}
    </div>
  );
};

export const OrangeMoneyLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  customLogoUrl,
}) => {
  const sizeClasses = {
    sm: 'h-6 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-12 text-base',
  }[size];

  const imgHeightClass = {
    sm: 'h-5 max-w-[80px]',
    md: 'h-7 max-w-[110px]',
    lg: 'h-9 max-w-[140px]',
  }[size];

  if (customLogoUrl) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-gray-200 shadow-xs ${className}`}>
        <img
          src={customLogoUrl}
          alt="Orange Money"
          className={`${imgHeightClass} object-contain`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {showText && <span className="text-xs font-bold text-gray-800">Orange Money</span>}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md font-bold text-white shadow-xs ${sizeClasses} ${className}`}
      style={{ backgroundColor: '#FF6600' }}
    >
      <div className="w-4 h-4 bg-black rounded-xs flex items-center justify-center">
        <div className="w-2.5 h-2.5 bg-[#FF6600] rounded-xs"></div>
      </div>
      {showText && <span>orange money</span>}
    </div>
  );
};

export const MpesaLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  customLogoUrl,
}) => {
  const sizeClasses = {
    sm: 'h-6 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-12 text-base',
  }[size];

  const imgHeightClass = {
    sm: 'h-5 max-w-[80px]',
    md: 'h-7 max-w-[110px]',
    lg: 'h-9 max-w-[140px]',
  }[size];

  if (customLogoUrl) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-gray-200 shadow-xs ${className}`}>
        <img
          src={customLogoUrl}
          alt="Vodacom M-Pesa"
          className={`${imgHeightClass} object-contain`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {showText && <span className="text-xs font-bold text-gray-800">M-PESA</span>}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md font-bold text-white shadow-xs ${sizeClasses} ${className}`}
      style={{ backgroundColor: '#E60000' }}
    >
      <div className="w-5 h-5 rounded-full bg-[#00A859] flex items-center justify-center text-white font-black text-xs">
        M
      </div>
      {showText && <span className="tracking-tight">M-PESA</span>}
    </div>
  );
};

export const AfriMoneyLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  customLogoUrl,
}) => {
  const sizeClasses = {
    sm: 'h-6 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-12 text-base',
  }[size];

  const imgHeightClass = {
    sm: 'h-5 max-w-[80px]',
    md: 'h-7 max-w-[110px]',
    lg: 'h-9 max-w-[140px]',
  }[size];

  if (customLogoUrl) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-gray-200 shadow-xs ${className}`}>
        <img
          src={customLogoUrl}
          alt="AfriMoney"
          className={`${imgHeightClass} object-contain`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {showText && <span className="text-xs font-bold text-gray-800">AfriMoney</span>}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md font-bold text-white shadow-xs ${sizeClasses} ${className}`}
      style={{ backgroundColor: '#6C207E' }}
    >
      <div className="w-5 h-5 rounded-full bg-[#FFD100] flex items-center justify-center text-[#6C207E] font-black text-xs">
        Af
      </div>
      {showText && <span className="tracking-tight">AfriMoney</span>}
    </div>
  );
};

export const PaymentMethodBadge: React.FC<{
  method: 'airtel_money' | 'orange_money' | 'mpesa' | 'afrimoney';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  customLogoUrl?: string;
}> = ({ method, size = 'md', showText = true, customLogoUrl }) => {
  switch (method) {
    case 'airtel_money':
      return <AirtelMoneyLogo size={size} showText={showText} customLogoUrl={customLogoUrl} />;
    case 'orange_money':
      return <OrangeMoneyLogo size={size} showText={showText} customLogoUrl={customLogoUrl} />;
    case 'mpesa':
      return <MpesaLogo size={size} showText={showText} customLogoUrl={customLogoUrl} />;
    case 'afrimoney':
      return <AfriMoneyLogo size={size} showText={showText} customLogoUrl={customLogoUrl} />;
    default:
      return null;
  }
};

/** Logo de l'opérateur correspondant à un moyen de paiement, avec le logo personnalisé de l'admin s'il existe. */
export const MethodLogo: React.FC<{ method: PaymentMethod; gateways: PaymentGatewayConfig; size?: 'sm' | 'md' | 'lg' }> = ({
  method,
  gateways,
  size = 'sm',
}) => {
  const customLogoUrl = gateways[METHOD_TO_GATEWAY[method]]?.customLogoUrl;
  if (method === 'airtel_money') return <AirtelMoneyLogo size={size} customLogoUrl={customLogoUrl} />;
  if (method === 'orange_money') return <OrangeMoneyLogo size={size} customLogoUrl={customLogoUrl} />;
  if (method === 'mpesa') return <MpesaLogo size={size} customLogoUrl={customLogoUrl} />;
  return <AfriMoneyLogo size={size} customLogoUrl={customLogoUrl} />;
};
