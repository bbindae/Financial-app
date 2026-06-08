import { StockNewsItem, StockNewsResponse } from '../types/StockNews';

interface RawNewsItem {
  id?: number | string;
  title?: string;
  content?: string;
  content_kr?: string;
  contentKr?: string;
  summary?: string;
  summary_kr?: string;
  summaryKr?: string;
  published_date?: string;
  publishedDate?: string;
  url?: string;
  sentiment_label?: string;
  sentimentLabel?: string;
  sentiment_score?: number | string;
  sentimentScore?: number | string;
}

interface RawNewsResponse {
  ticker?: string;
  company_name?: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  news_list?: RawNewsItem[];
  newsList?: RawNewsItem[];
}

interface FinnhubProfileResponse {
  finnhubIndustry?: string;
  name?: string;
}

class StockNewsService {
  private readonly newsCache = new Map<string, { data: StockNewsResponse; timestamp: number }>();
  private readonly profileCache = new Map<string, { name?: string; industry?: string; timestamp: number }>();
  private readonly NEWS_CACHE_DURATION = 5 * 60 * 1000;
  private readonly PROFILE_CACHE_DURATION = 24 * 60 * 60 * 1000;
  private readonly newsEndpoint = (import.meta as any).env?.VITE_STOCK_NEWS_API_URL || '/api/stock-news';
  private readonly finnhubApiKey = (import.meta as any).env?.VITE_FINNHUB_API_KEY || '';

  async getNews(ticker: string): Promise<StockNewsResponse> {
    const normalizedTicker = ticker.trim().toUpperCase();
    const cached = this.newsCache.get(normalizedTicker);

    if (cached && Date.now() - cached.timestamp < this.NEWS_CACHE_DURATION) {
      return cached.data;
    }

    const response = await fetch(this.newsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker: normalizedTicker }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to fetch stock news for ${normalizedTicker}`);
    }

    const rawData = (await response.json()) as RawNewsResponse;
    const normalized = this.normalizeNewsResponse(normalizedTicker, rawData);

    if (!normalized.companyName || !normalized.industry) {
      const profile = await this.getCompanyProfile(normalizedTicker);
      normalized.companyName = normalized.companyName || profile.name;
      normalized.industry = normalized.industry || profile.industry;
    }

    this.newsCache.set(normalizedTicker, {
      data: normalized,
      timestamp: Date.now(),
    });

    return normalized;
  }

  private normalizeNewsResponse(ticker: string, rawData: RawNewsResponse): StockNewsResponse {
    const rawItems = rawData.news_list || rawData.newsList || [];

    return {
      ticker: rawData.ticker || ticker,
      companyName: rawData.company_name || rawData.companyName,
      sector: rawData.sector,
      industry: rawData.industry,
      newsList: rawItems.map((item, index) => this.normalizeNewsItem(item, index)),
    };
  }

  private normalizeNewsItem(item: RawNewsItem, index: number): StockNewsItem {
    const sentimentValue = item.sentiment_score ?? item.sentimentScore ?? 0;
    const score = typeof sentimentValue === 'string' ? Number(sentimentValue) : sentimentValue;

    return {
      id: item.id ?? index,
      title: item.title || 'Untitled article',
      content: item.content || '',
      contentKr: item.content_kr || item.contentKr || '',
      summary: item.summary || '',
      summaryKr: item.summary_kr || item.summaryKr || '',
      publishedDate: item.published_date || item.publishedDate || '',
      url: item.url || '',
      sentimentLabel: item.sentiment_label || item.sentimentLabel || 'Neutral',
      sentimentScore: Number.isFinite(score) ? score : 0,
    };
  }

  private async getCompanyProfile(ticker: string): Promise<{ name?: string; industry?: string }> {
    if (!this.finnhubApiKey || this.finnhubApiKey === 'YOUR_API_KEY_HERE') {
      return {};
    }

    const cached = this.profileCache.get(ticker);
    if (cached && Date.now() - cached.timestamp < this.PROFILE_CACHE_DURATION) {
      return cached;
    }

    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${this.finnhubApiKey}`
      );

      if (!response.ok) {
        return {};
      }

      const data = (await response.json()) as FinnhubProfileResponse;
      const profile = {
        name: data.name,
        industry: data.finnhubIndustry,
        timestamp: Date.now(),
      };

      this.profileCache.set(ticker, profile);
      return profile;
    } catch (error) {
      console.warn(`Failed to fetch company profile for ${ticker}:`, error);
      return {};
    }
  }
}

export default new StockNewsService();