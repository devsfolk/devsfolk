import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface BlueprintResult {
  id: number;
  title: string;
  brand: string;
  description?: string;
  model?: string;
}

interface BlueprintSearchProps {
  apiKey: string;
  onSelect: (blueprintId: number, title: string) => void;
  className?: string;
}

export const BlueprintSearch: React.FC<BlueprintSearchProps> = ({
  apiKey,
  onSelect,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BlueprintResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      await searchBlueprints(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, apiKey]);

  const searchBlueprints = async (searchQuery: string) => {
    if (!apiKey) {
      setError('API key is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/printify/blueprint-search?query=${encodeURIComponent(searchQuery)}&apiKey=${encodeURIComponent(apiKey)}`
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      setShowDropdown(true);
    } catch (err: any) {
      console.error('[Blueprint Search] Error:', err);
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: BlueprintResult) => {
    onSelect(result.id, result.title);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search Printify blueprints... (e.g., 'hoodie', 't-shirt', 'mug')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 rounded-xl h-11 text-xs"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {error && (
        <p className="text-[10px] text-red-600 mt-1 pl-1">{error}</p>
      )}

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-80 overflow-y-auto">
          <div className="p-2 space-y-1">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {result.title}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {result.brand} {result.model && `• ${result.model}`}
                    </p>
                    {result.description && (
                      <p className="text-[9px] text-gray-400 mt-1 line-clamp-1">
                        {result.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-[9px] font-black">
                      ID: {result.id}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 p-2">
            <a
              href="https://printify.com/app/products/catalog"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-[10px] text-gray-500 hover:text-gray-700 py-2 font-bold uppercase tracking-wider"
            >
              <ExternalLink className="h-3 w-3" />
              Browse Full Printify Catalog
            </a>
          </div>
        </div>
      )}

      {showDropdown && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 text-center">
          <p className="text-xs text-gray-500">No blueprints found for "{query}"</p>
          <p className="text-[10px] text-gray-400 mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
};
