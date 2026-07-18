import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface EtsyListingRecord {
  id: string;
  shop_id: string;
  listing_id: string;
  product_id: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  images: any[] | null;
  shop_section_id: string | null;
  taxonomy_id: string | null;
  sync_status: string | null;
  last_synced_at: string | null;
}

export interface EtsyListingVariationRecord {
  id: string;
  listing_id: string;
  sku: string | null;
  properties: any;
  price: number | null;
  quantity: number | null;
}

export interface EtsyPersonalizationQuestionRecord {
  id: string;
  listing_id: string;
  question_type: string;
  prompt: string | null;
  is_required: boolean | null;
  max_length: number | null;
  choices: any;
}

export const useEtsyListings = (productId?: string) => {
  const [listing, setListing] = useState<EtsyListingRecord | null>(null);
  const [variations, setVariations] = useState<EtsyListingVariationRecord[]>([]);
  const [personalizationQuestions, setPersonalizationQuestions] = useState<EtsyPersonalizationQuestionRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!productId) {
        setListing(null);
        setVariations([]);
        setPersonalizationQuestions([]);
        setLoading(false);
        return;
      }

      if (!supabase) {
        setError('Supabase configuration is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const { data: listingRow, error: listingError } = await supabase
        .from('etsy_listings')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (listingError) {
        setError(listingError.message);
        setListing(null);
        setVariations([]);
        setPersonalizationQuestions([]);
        setLoading(false);
        return;
      }

      const nextListing = (listingRow as EtsyListingRecord | null) ?? null;
      setListing(nextListing);

      if (!nextListing?.listing_id) {
        setVariations([]);
        setPersonalizationQuestions([]);
        setLoading(false);
        return;
      }

      const [variationResult, questionResult] = await Promise.all([
        supabase.from('etsy_listing_variations').select('*').eq('listing_id', nextListing.listing_id),
        supabase.from('etsy_personalization_questions').select('*').eq('listing_id', nextListing.listing_id),
      ]);

      if (cancelled) {
        return;
      }

      if (variationResult.error) {
        setError(variationResult.error.message);
      }

      if (questionResult.error) {
        setError(questionResult.error.message);
      }

      setVariations((variationResult.data || []) as EtsyListingVariationRecord[]);
      setPersonalizationQuestions((questionResult.data || []) as EtsyPersonalizationQuestionRecord[]);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  return useMemo(() => ({
    listing,
    variations,
    personalizationQuestions,
    loading,
    error,
  }), [listing, variations, personalizationQuestions, loading, error]);
};
