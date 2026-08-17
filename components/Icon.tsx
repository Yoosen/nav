import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, size = 20, className }) => {
  // 若为 emoji（非 Lucide 图标名），直接渲染字符
  // @ts-ignore - Dynamic access to Lucide icons
  const IconComponent = (name && LucideIcons[name]) || null;
  if (!IconComponent) {
    return (
      <span
        style={{ fontSize: `${size}px`, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        className={className}
        aria-label={name}
      >
        {name}
      </span>
    );
  }
  return <IconComponent size={size} className={className} />;
};

export default Icon;