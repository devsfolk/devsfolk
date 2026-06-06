import React from 'react';
import { BespokeCustomizer } from '@/components/printify/BespokeCustomizer';

export const ProductCustomizePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <BespokeCustomizer showHeader={true} />
    </div>
  );
};
