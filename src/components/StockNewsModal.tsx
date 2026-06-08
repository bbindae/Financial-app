import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import stockNewsService from '../services/StockNewsService';
import { StockNewsItem, StockNewsResponse } from '../types/StockNews';

interface StockNewsModalProps {
  ticker: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatPublishedDate = (value: string): string => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const formatter = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';

  return `${get('weekday')}, ${get('day')} ${get('month')} ${get('year')} ${get('hour')}:${get('minute')}:${get('second')} ${get('timeZoneName')}`;
};

const getSentimentStyles = (score: number) => {
  if (score >= 0.25) {
    return {
      dotClassName: 'bg-green-400',
      textClassName: 'text-green-300',
      label: 'positive',
    };
  }

  if (score <= -0.25) {
    return {
      dotClassName: 'bg-red-400',
      textClassName: 'text-red-300',
      label: 'negative',
    };
  }

  return {
    dotClassName: 'bg-yellow-300',
    textClassName: 'text-yellow-200',
    label: 'neutral',
  };
};

const renderTextBlock = (title: string, body: string) => (
  <section>
    <h4 className="text-xl font-semibold text-white">{title}</h4>
    <p className="mt-4 whitespace-pre-line break-words text-base leading-7 text-slate-300">
      {body || '--'}
    </p>
  </section>
);

const StockNewsCard: React.FC<{ article: StockNewsItem; index: number }> = ({ article, index }) => {
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const sentiment = getSentimentStyles(article.sentimentScore);
  const hasDetailedContent = Boolean(article.content || article.contentKr);

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg shadow-black/20">
      <h3 className="text-3xl font-semibold tracking-tight text-slate-100">
        {index + 1}. {article.title}
      </h3>

      <div className="mt-6 space-y-1 text-sm text-slate-300">
        <p>
          <span className="font-semibold text-slate-100">Published date:</span> {formatPublishedDate(article.publishedDate)}
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-100">Sentiment:</span>
          <span className={`inline-flex h-3 w-3 rounded-full ${sentiment.dotClassName}`} aria-hidden="true" />
          <span className={sentiment.textClassName}>{sentiment.label}</span>
          <span className="text-slate-400">(score: {article.sentimentScore.toFixed(2)})</span>
        </p>
        <p className="break-all">
          <span className="font-semibold text-slate-100">URL:</span>{' '}
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 transition-colors hover:text-sky-300"
            >
              {article.url}
            </a>
          ) : (
            '--'
          )}
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {renderTextBlock('Summary', article.summary)}
        {renderTextBlock('요약', article.summaryKr)}

        {hasDetailedContent && (
          <div>
            <button
              type="button"
              onClick={() => setIsContentExpanded((current) => !current)}
              className="text-base font-semibold text-sky-400 transition-colors hover:text-sky-300"
            >
              {isContentExpanded ? 'Hide details' : 'more...'}
            </button>
          </div>
        )}

        {isContentExpanded && (
          <>
            {renderTextBlock('Content', article.content)}
            {renderTextBlock('내용', article.contentKr)}
          </>
        )}
      </div>
    </article>
  );
};

const StockNewsLoadingState: React.FC<{ ticker: string }> = ({ ticker }) => {
  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70">
      <div className="border-b border-slate-700/80 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400" />
          <div>
            <p className="text-lg font-semibold text-slate-100">Loading {ticker} news</p>
            <p className="mt-1 text-sm text-slate-400">This request can take up to about a minute.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="h-8 w-3/4 animate-pulse rounded bg-slate-800" />
            <div className="mt-5 h-4 w-1/2 animate-pulse rounded bg-slate-800" />
            <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-800" />
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const StockNewsModal: React.FC<StockNewsModalProps> = ({ ticker, isOpen, onClose }) => {
  const [news, setNews] = useState<StockNewsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !ticker) {
      return;
    }

    let isCancelled = false;

    const loadNews = async () => {
      setLoading(true);
      setError(null);
      setNews(null);

      try {
        const response = await stockNewsService.getNews(ticker);
        if (!isCancelled) {
          setNews(response);
        }
      } catch (loadError) {
        if (!isCancelled) {
          console.error('Failed to load stock news:', loadError);
          setError(loadError instanceof Error ? loadError.message : 'Failed to load stock news.');
          setNews(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadNews();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, ticker]);

  const headingTicker = news?.ticker || ticker || '';
  const headingName = news?.companyName?.trim();
  const title = headingName ? `📈 ${headingTicker} - ${headingName}` : `📈 ${headingTicker}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="rounded-lg bg-[#121416] px-8 py-10 text-slate-100">
        <div className="pr-12">
          <h2 className="text-4xl font-semibold tracking-tight text-slate-100">{title} News</h2>

          <div className="mt-6 space-y-1 text-base text-slate-300">
            <p>
              <span className="font-semibold text-slate-100">Sector:</span> {news?.sector || '--'}
            </p>
            <p>
              <span className="font-semibold text-slate-100">Industry:</span> {news?.industry || '--'}
            </p>
          </div>
        </div>

        {loading && (
          <StockNewsLoadingState ticker={headingTicker} />
        )}

        {error && !loading && (
          <div className="mt-10 rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-8 text-lg text-red-200">
            <p className="font-semibold">Failed to load stock news.</p>
            <p className="mt-3 text-base text-red-100/90">{error}</p>
          </div>
        )}

        {!loading && !error && news && news.newsList.length === 0 && (
          <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-900/70 px-6 py-8 text-lg text-slate-300">
            No recent news found for {headingTicker}.
          </div>
        )}

        {!loading && !error && news && news.newsList.length > 0 && (
          <div className="mt-10 space-y-8">
            {news.newsList.map((article, index) => (
              <StockNewsCard key={article.id} article={article} index={index} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
