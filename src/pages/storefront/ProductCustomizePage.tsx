import React from 'react';
import { useParams } from 'react-router-dom';
import { BespokeCustomizer } from '@/components/printify/BespokeCustomizer';

export const ProductCustomizePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <BespokeCustomizer productSlug={slug} showHeader={true} />
    </div>
  );
};
