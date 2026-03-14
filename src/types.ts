export interface StatsSummary {
  coefficients: {
    intercept: number;
    pm25: number;
  };
  rSquared: number;
  pValue: number;
  n: number;
}

export interface DataPoint {
  x: number;
  y: number;
}

export type AnalysisMode = 'researcher' | 'public';

export interface NewsItem {
  id: string;
  title: string;
  oneSentenceSummary: string;
  conceptImageUrl: string;
  plainTextContent: string;
  abstract?: string;
  translatedAbstract?: string;
  sourceLink: string;
  sourceJournal: string;
  publishDate: string;
  category: string;
}

export interface AnalysisResult {
  summary: StatsSummary;
  data: DataPoint[];
  columns: {
    x: string;
    y: string;
  };
}
