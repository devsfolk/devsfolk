import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Printify Blueprint Search API
 * GET /api/printify/blueprint-search?query=hoodie
 * 
 * Searches Printify catalog for blueprints matching the query
 * Returns: Blueprint ID, Title, Brand for easy selection
 */

const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

interface BlueprintSearchResult {
  id: number;
  title: string;
  brand: string;
  description?: string;
  model?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, apiKey } = req.query;

  // Validate inputs
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    // Fetch all blueprints from Printify catalog
    const response = await fetch(`${PRINTIFY_API_BASE}/catalog/blueprints.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'devsfolk-app/1.0',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Blueprint Search] Printify API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Printify API returned status ${response.status}`,
        details: errorText,
      });
    }

    const data = await response.json();
    const blueprints = data.data || data || [];

    // Filter blueprints by query (case-insensitive search)
    const searchTerm = query.toLowerCase();
    const filtered: BlueprintSearchResult[] = blueprints
      .filter((bp: any) => {
        const title = String(bp.title || '').toLowerCase();
        const brand = String(bp.brand || '').toLowerCase();
        const description = String(bp.description || '').toLowerCase();
        const model = String(bp.model || '').toLowerCase();

        return (
          title.includes(searchTerm) ||
          brand.includes(searchTerm) ||
          description.includes(searchTerm) ||
          model.includes(searchTerm)
        );
      })
      .map((bp: any) => ({
        id: bp.id,
        title: bp.title,
        brand: bp.brand || 'Unknown',
        description: bp.description || '',
        model: bp.model || '',
      }))
      .slice(0, 20); // Limit to 20 results for performance

    return res.status(200).json({
      success: true,
      results: filtered,
      count: filtered.length,
    });

  } catch (error: any) {
    console.error('[Blueprint Search] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || String(error),
    });
  }
}
