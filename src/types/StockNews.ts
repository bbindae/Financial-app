export interface StockNewsItem {
  id: number | string;
  title: string;
  content: string;
  contentKr: string;
  summary: string;
  summaryKr: string;
  publishedDate: string;
  url: string;
  sentimentLabel: string;
  sentimentScore: number;
}

export interface StockNewsResponse {
  ticker: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  newsList: StockNewsItem[];
}
