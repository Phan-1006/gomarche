import React from 'react';
import { METHOD_TO_GATEWAY, PaymentGatewayConfig, PaymentMethod } from '../types';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  customLogoUrl?: string;
}

// Logos officiels des opérateurs (voir public/logos/README.md pour les sources).
const BRANDS = {
  airtel: { name: 'Airtel Money', src: '/logos/airtel.svg', chip: 'bg-white border-gray-200', scale: 1.15, suffix: 'money', suffixColor: '#E40000' },
  orange: { name: 'Orange Money', src: '/logos/orange-money.svg', chip: 'bg-white border-gray-200', scale: 0.8, suffix: '', suffixColor: '' },
  mpesa: { name: 'M-Pesa', src: '/logos/mpesa.svg', chip: 'bg-white border-gray-200', scale: 1.1, suffix: '', suffixColor: '' },
  // Le logo AfriMoney fourni par Africell est blanc : il se pose sur le violet de la marque.
  afrimoney: { name: 'AfriMoney', src: '/logos/afrimoney.png', chip: 'bg-[#6C207E] border-[#6C207E]', scale: 0.7, suffix: '', suffixColor: '' },
} as const;

// Hauteur de la pastille et hauteur de base de l'image (en rem), par taille.
const SIZES = { sm: { chip: 'h-7 px-2', img: 1.25 }, md: { chip: 'h-10 px-3', img: 1.9 }, lg: { chip: 'h-12 px-3.5', img: 2.4 } };

const BrandLogo: React.FC<LogoProps & { brand: keyof typeof BRANDS }> = ({ brand, className = '', size = 'md', showText = true, customLogoUrl }) => {
  const b = BRANDS[brand];
  const s = SIZES[size];
  const custom = !!customLogoUrl;
  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border shadow-xs shrink-0 ${s.chip} ${custom ? 'bg-white border-gray-200' : b.chip} ${className}`}
    >
      <img
        src={customLogoUrl || b.src}
        alt={b.name}
        loading="lazy"
        style={{ height: `${s.img * (custom ? 1 : b.scale)}rem` }}
        className="w-auto max-w-[9rem] object-contain"
      />
      {/* Airtel n'a pas de logo « Airtel Money » distinct : le mot accompagne le logo de l'opérateur. */}
      {!custom && showText && b.suffix && (
        <span className="text-xs font-black lowercase" style={{ color: b.suffixColor }}>
          {b.suffix}
        </span>
      )}
    </span>
  );
};

export const AirtelMoneyLogo: React.FC<LogoProps> = (props) => <BrandLogo brand="airtel" {...props} />;
export const OrangeMoneyLogo: React.FC<LogoProps> = (props) => <BrandLogo brand="orange" {...props} />;
export const MpesaLogo: React.FC<LogoProps> = (props) => <BrandLogo brand="mpesa" {...props} />;
export const AfriMoneyLogo: React.FC<LogoProps> = (props) => <BrandLogo brand="afrimoney" {...props} />;

export const PaymentMethodBadge: React.FC<{
  method: PaymentMethod;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  customLogoUrl?: string;
}> = ({ method, ...props }) => <BrandLogo brand={METHOD_TO_GATEWAY[method]} {...props} />;

/** Logo de l'opérateur correspondant à un moyen de paiement, avec le logo personnalisé de l'admin s'il existe. */
export const MethodLogo: React.FC<{ method: PaymentMethod; gateways: PaymentGatewayConfig; size?: 'sm' | 'md' | 'lg' }> = ({
  method,
  gateways,
  size = 'sm',
}) => <BrandLogo brand={METHOD_TO_GATEWAY[method]} size={size} customLogoUrl={gateways[METHOD_TO_GATEWAY[method]]?.customLogoUrl} />;
