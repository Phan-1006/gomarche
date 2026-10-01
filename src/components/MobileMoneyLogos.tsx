import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const AirtelMoneyLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const sizeClasses = {
    sm: 'h-6 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-12 text-base',
  }[size];

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
}) => {
  const sizeClasses = {
    sm: 'h-6 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-12 text-base',
  }[size];

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
}) => {
  const sizeClasses = {
    sm: 'h-6 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-12 text-base',
  }[size];

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
}) => {
  const sizeClasses = {
    sm: 'h-6 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-12 text-base',
  }[size];

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
}> = ({ method, size = 'md', showText = true }) => {
  switch (method) {
    case 'airtel_money':
      return <AirtelMoneyLogo size={size} showText={showText} />;
    case 'orange_money':
      return <OrangeMoneyLogo size={size} showText={showText} />;
    case 'mpesa':
      return <MpesaLogo size={size} showText={showText} />;
    case 'afrimoney':
      return <AfriMoneyLogo size={size} showText={showText} />;
    default:
      return null;
  }
};
