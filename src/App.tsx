import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Activity, 
  ShieldAlert, 
  FileText, 
  TrendingDown, 
  TrendingUp, 
  Info, 
  ChevronRight,
  Download,
  RefreshCw,
  User,
  Search,
  AlertTriangle,
  Newspaper,
  Globe,
  ArrowLeft,
  ExternalLink,
  Calendar,
  Filter
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter,
  ZAxis
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnalysisResult, AnalysisMode, StatsSummary, NewsItem } from './types';
import { getAIAnalysis, getWhatIfAnalysis } from './services/geminiService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [mode, setMode] = useState<AnalysisMode>('researcher');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [pm25Delta, setPm25Delta] = useState(0);
  const [whatIfResponse, setWhatIfResponse] = useState<string>('');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'news' | 'workbench'>('news');

  useEffect(() => {
    fetchNews();
  }, [activeCategory]);

  useEffect(() => {
    if (result) {
      triggerAIAnalysis(result, mode);
    }
  }, [mode]);

  const fetchNews = async (query?: string) => {
    setNewsLoading(true);
    try {
      const url = new URL('/api/news', window.location.origin);
      if (activeCategory !== '全部') url.searchParams.append('category', activeCategory);
      if (query) url.searchParams.append('q', query);
      const res = await fetch(url.toString());
      const data = await res.json();
      setNewsItems(data);
    } catch (err) {
      console.error('Failed to fetch news:', err);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleCrawl = async () => {
    setNewsLoading(true);
    try {
      const res = await fetch('/api/news/crawl', { method: 'POST' });
      const data = await res.json();
      setNewsItems(prev => [data, ...prev]);
    } catch (err) {
      console.error('Crawl failed:', err);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', uploadedFile);

    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(data);
      triggerAIAnalysis(data, mode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerAIAnalysis = async (data: AnalysisResult, currentMode: AnalysisMode) => {
    setAiLoading(true);
    try {
      const response = await getAIAnalysis(data.summary, data.data, currentMode);
      setAiResponse(response);
    } catch (err: any) {
      console.error(err);
      setAiResponse('AI 分析暂时不可用，请稍后再试。');
    } finally {
      setAiLoading(false);
    }
  };

  const handleWhatIf = async () => {
    if (!result) return;
    setWhatIfLoading(true);
    try {
      const predictedChange = result.summary.coefficients.pm25 * (pm25Delta / 100 * result.data[0].x);
      const response = await getWhatIfAnalysis(
        { pm25Change: pm25Delta, predictedDiseaseChange: predictedChange },
        result.summary.coefficients.pm25
      );
      setWhatIfResponse(response);
    } catch (err) {
      setWhatIfResponse('模拟分析失败。');
    } finally {
      setWhatIfLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('EnvInsight AI Pro 分析报告', 20, 20);
    doc.setFontSize(12);
    doc.text(`生成日期: ${new Date().toLocaleString()}`, 20, 30);
    doc.text(`分析模式: 专业科研分析`, 20, 40);
    
    doc.text('统计摘要:', 20, 60);
    doc.text(`样本量 (n): ${result.summary.n}`, 30, 70);
    doc.text(`R-Squared: ${result.summary.rSquared.toFixed(4)}`, 30, 80);
    doc.text(`P-Value: ${result.summary.pValue.toFixed(4)}`, 30, 90);
    doc.text(`PM2.5 系数: ${result.summary.coefficients.pm25.toFixed(4)}`, 30, 100);

    doc.text('AI 解读:', 20, 120);
    const splitText = doc.splitTextToSize(aiResponse, 170);
    doc.text(splitText, 20, 130);

    doc.setFontSize(8);
    doc.text('免责声明: 本建议基于统计数据生成，仅供参考，不构成医疗诊断。如有不适请咨询专业医生。', 20, 280);
    
    doc.save('EnvInsight_Report.pdf');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">EnvInsight AI Pro</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">智能环境健康决策系统 V3.2</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => {
                  setView('news');
                  setMode('public');
                }}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  view === 'news' ? "bg-emerald-50 text-emerald-700" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <Newspaper size={18} />
                大众资讯
              </button>
              <button 
                onClick={() => {
                  setView('workbench');
                  setMode('researcher');
                }}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  view === 'workbench' ? "bg-emerald-50 text-emerald-700" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <Activity size={18} />
                专业工作台
              </button>
            </nav>

          <div className="h-6 w-px bg-gray-200 hidden md:block" />

          <div className="flex items-center gap-4">
            {result && view === 'workbench' && (
              <button 
                onClick={downloadPDF}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Download size={16} />
                导出报告
              </button>
            )}
          </div>
        </div>
      </header>

      {view === 'news' ? (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {selectedNews ? (
            <NewsDetail item={selectedNews} onBack={() => setSelectedNews(null)} />
          ) : (
            <div className="space-y-8">
              {/* News Header & Filter */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900">环境健康头条</h2>
                  <p className="text-gray-500 mt-1">AI 驱动的全球环境科研资讯实时解读</p>
                  
                  <div className="mt-6 relative max-w-xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text"
                      placeholder="搜索研究论文、关键词或健康建议..."
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none shadow-sm"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        fetchNews(e.target.value);
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                  {['全部', '空气质量', '气候变化', '流行病学', '政策解读'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                        activeCategory === cat 
                          ? "bg-gray-900 text-white" 
                          : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                  <button 
                    onClick={handleCrawl}
                    disabled={newsLoading}
                    className="ml-2 p-2 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    title="抓取最新论文"
                  >
                    <RefreshCw size={18} className={newsLoading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* News Grid */}
              {newsLoading && newsItems.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 h-80 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Featured Section */}
                  {activeCategory === '全部' && newsItems.length >= 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {newsItems.slice(0, 2).map((item) => (
                        <NewsCard 
                          key={item.id} 
                          item={item} 
                          featured 
                          onClick={() => setSelectedNews(item)} 
                        />
                      ))}
                    </div>
                  )}

                  {/* List Section */}
                  <div className="space-y-6">
                    {(activeCategory === '全部' ? newsItems.slice(2) : newsItems)
                      .filter(item => activeCategory === '全部' || item.category === activeCategory)
                      .map((item: NewsItem) => (
                        <NewsStrip 
                          key={item.id} 
                          item={item} 
                          onClick={() => setSelectedNews(item)} 
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controls & Data */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upload Card */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload size={20} className="text-emerald-600" />
              数据接入
            </h2>
            <div 
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group",
                file ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 hover:border-emerald-400 hover:bg-gray-50"
              )}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                accept=".csv" 
                onChange={handleFileUpload}
              />
              <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileText className="text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                {file ? file.name : "点击或拖拽上传 CSV 文件"}
              </p>
              <p className="text-xs text-gray-500 mt-1">支持 PM2.5 与 疾病率 相关数据</p>
            </div>

            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch('/api/sample-data');
                  const sampleData = await res.json();
                  
                  // Mock a file upload response
                  const formData = new FormData();
                  const blob = new Blob([JSON.stringify(sampleData)], { type: 'application/json' });
                  // Actually, let's just use the analyze endpoint with a generated CSV
                  const csvContent = "pm25,disease_rate\n" + sampleData.map((d: any) => `${d.pm25},${d.disease_rate}`).join("\n");
                  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
                  const csvFile = new File([csvBlob], 'sample_data.csv', { type: 'text/csv' });
                  
                  const uploadFormData = new FormData();
                  uploadFormData.append('file', csvFile);
                  
                  const analyzeRes = await fetch('/api/analyze', {
                    method: 'POST',
                    body: uploadFormData,
                  });
                  const resultData = await analyzeRes.json();
                  setResult(resultData);
                  setFile(csvFile);
                  triggerAIAnalysis(resultData, mode);
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full mt-4 text-xs text-emerald-600 font-bold uppercase tracking-widest hover:text-emerald-700 transition-colors py-2 border border-emerald-100 rounded-lg bg-emerald-50/50"
            >
              使用示例数据进行演示
            </button>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {loading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
                <RefreshCw className="animate-spin" size={16} />
                正在进行 OLS 回归分析...
              </div>
            )}
          </section>

          {/* What-If Simulator */}
          <section className={cn(
            "bg-white rounded-2xl border border-gray-200 p-6 shadow-sm transition-opacity",
            !result && "opacity-50 pointer-events-none"
          )}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RefreshCw size={20} className="text-emerald-600" />
              What-If 决策模拟
            </h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">环境变量 (PM2.5) 调整</label>
                  <span className={cn(
                    "text-sm font-bold",
                    pm25Delta > 0 ? "text-red-600" : pm25Delta < 0 ? "text-emerald-600" : "text-gray-500"
                  )}>
                    {pm25Delta > 0 ? '+' : ''}{pm25Delta}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-50" 
                  max="50" 
                  value={pm25Delta}
                  onChange={(e) => setPm25Delta(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between mt-1 text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                  <span>大幅改善 (-50%)</span>
                  <span>无干预</span>
                  <span>大幅恶化 (+50%)</span>
                </div>
              </div>

              <button 
                onClick={handleWhatIf}
                disabled={whatIfLoading}
                className="w-full bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                {whatIfLoading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                运行模拟预测
              </button>

              {whatIfResponse && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl"
                >
                  <p className="text-xs text-emerald-900 leading-relaxed whitespace-pre-wrap">
                    {whatIfResponse}
                  </p>
                </motion.div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Insights & Visualization */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">R-Squared (拟合度)</p>
              <p className="text-2xl font-bold text-gray-900">
                {result ? result.summary.rSquared.toFixed(3) : '--'}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                <Info size={10} />
                模型对变异的解释程度
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">P-Value (显著性)</p>
              <p className={cn(
                "text-2xl font-bold",
                result && result.summary.pValue < 0.05 ? "text-emerald-600" : "text-gray-900"
              )}>
                {result ? result.summary.pValue.toFixed(3) : '--'}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-medium">
                {result && result.summary.pValue < 0.05 ? (
                  <span className="text-emerald-600 flex items-center gap-1"><TrendingDown size={10} /> 统计学显著</span>
                ) : (
                  <span className="text-gray-400 flex items-center gap-1"><TrendingUp size={10} /> 统计学不显著</span>
                )}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Beta (影响系数)</p>
              <p className="text-2xl font-bold text-gray-900">
                {result ? result.summary.coefficients.pm25.toFixed(4) : '--'}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-gray-500">
                每单位 PM2.5 变化对疾病率的影响
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-600" />
                回归分析可视化
              </h2>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500"></div>
                  观测数据点
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-0.5 bg-emerald-600"></div>
                  OLS 拟合线
                </div>
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              {result ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F5" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="PM2.5" 
                      unit=" μg/m³" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#868E96' }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="疾病率" 
                      unit="%" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#868E96' }}
                    />
                    <ZAxis type="number" range={[60, 60]} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Scatter 
                      name="数据点" 
                      data={result.data} 
                      fill="#10B981" 
                      fillOpacity={0.4}
                      stroke="#059669"
                    />
                    {/* Trend Line */}
                    <Line 
                      type="monotone" 
                      dataKey="y" 
                      stroke="#059669" 
                      strokeWidth={2} 
                      dot={false} 
                      activeDot={false}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Activity size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">等待数据上传以生成可视化图表</p>
                </div>
              )}
            </div>
          </section>

          {/* AI Insights Section */}
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity size={20} className="text-emerald-600" />
                AI 智能解读
              </h2>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                Professional Analysis
              </span>
            </div>
            
            <div className="p-6 min-h-[300px]">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
                  <div className="flex gap-1">
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-emerald-600 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-emerald-600 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-emerald-600 rounded-full" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">EnvInsight AI 正在深度分析数据逻辑...</p>
                </div>
              ) : aiResponse ? (
                <div className="prose prose-sm max-w-none">
                  <div className="space-y-6">
                    {aiResponse.split('\n\n').map((block, i) => {
                      if (block.startsWith('[思考过程]')) {
                        return (
                          <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <Search size={12} /> 思考过程
                            </h4>
                            <p className="text-gray-600 italic text-sm leading-relaxed">
                              {block.replace('[思考过程]', '').trim()}
                            </p>
                          </div>
                        );
                      }
                      if (block.startsWith('[正式回答]')) {
                        return (
                          <div key={i}>
                            <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <ChevronRight size={12} /> 分析结论
                            </h4>
                            <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                              {block.replace('[正式回答]', '').trim()}
                            </div>
                          </div>
                        );
                      }
                      return <p key={i} className="text-gray-800 text-sm leading-relaxed">{block}</p>;
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                  <Activity size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">上传数据后，AI 将自动生成深度解读报告</p>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                <ShieldAlert size={12} />
                本建议基于统计数据生成，仅供参考，不构成医疗诊断。如有不适请咨询专业医生。
              </p>
            </div>
          </section>
        </div>
      </main>
    )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Activity size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">EnvInsight AI Pro</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-xs text-gray-500 hover:text-emerald-600 font-medium transition-colors">用户协议</a>
            <a href="#" className="text-xs text-gray-500 hover:text-emerald-600 font-medium transition-colors">隐私政策</a>
            <a href="#" className="text-xs text-gray-500 hover:text-emerald-600 font-medium transition-colors">技术文档</a>
          </div>
          <p className="text-xs text-gray-400">© 2026 EnvInsight AI. All rights reserved.</p>
        </div>
      </footer>

      {/* Disclaimer Modal */}
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200"
            >
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto">
                <ShieldAlert className="text-red-600 w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-4">合规免责声明</h3>
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                <p>欢迎使用 EnvInsight AI Pro。在使用本系统前，请仔细阅读以下条款：</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>本系统生成的分析结论基于用户上传的统计数据，仅供科研与决策参考。</li>
                  <li className="font-bold text-red-600">本系统不提供任何形式的医疗诊断、用药建议或临床指导。</li>
                  <li>环境健康受多种复杂因素影响，统计相关性不代表必然的因果关系。</li>
                  <li>用户需自行承担基于本系统结论所采取行动的一切风险。</li>
                </ul>
                <p className="pt-2">点击“我已阅读并同意”即表示您接受上述条款。</p>
              </div>
              <button 
                onClick={() => setShowDisclaimer(false)}
                className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold mt-8 transition-all shadow-lg shadow-gray-200"
              >
                我已阅读并同意
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NewsStrip({ item, onClick }: { item: NewsItem; onClick: () => void; key?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className="flex items-center gap-6 p-4 bg-white rounded-2xl border border-gray-100 cursor-pointer transition-all hover:border-emerald-200 hover:shadow-md group"
    >
      <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-xl overflow-hidden">
        <img 
          src={item.conceptImageUrl} 
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">
          <span className="text-emerald-600">{item.category}</span>
          <span className="mx-1">•</span>
          {item.sourceJournal}
          <span className="mx-1">•</span>
          {item.publishDate}
        </div>
        <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 group-hover:text-emerald-600 transition-colors truncate">
          {item.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed hidden md:block">
          {item.oneSentenceSummary}
        </p>
      </div>
      
      <div className="hidden md:block">
        <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
      </div>
    </motion.div>
  );
}

function NewsCard({ item, featured, onClick }: { item: NewsItem; featured?: boolean; onClick: () => void; key?: string }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:border-emerald-100 group",
        featured ? "md:col-span-2 md:flex" : ""
      )}
    >
      <div className={cn(
        "relative overflow-hidden",
        featured ? "md:w-1/2 h-64 md:h-auto" : "h-48"
      )}>
        <img 
          src={item.conceptImageUrl} 
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-emerald-700 uppercase tracking-wider shadow-sm">
            {item.category}
          </span>
        </div>
      </div>
      
      <div className={cn(
        "p-6 flex flex-col justify-between",
        featured ? "md:w-1/2" : ""
      )}>
        <div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">
            <Globe size={10} />
            {item.sourceJournal}
            <span className="mx-1">•</span>
            <Calendar size={10} />
            {item.publishDate}
          </div>
          <h3 className={cn(
            "font-bold text-gray-900 leading-tight group-hover:text-emerald-600 transition-colors",
            featured ? "text-2xl mb-3" : "text-lg mb-2"
          )}>
            {item.title}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {item.oneSentenceSummary}
          </p>
        </div>
        
        <div className="mt-6 flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:gap-2 transition-all">
            阅读全文 <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function NewsDetail({ item, onBack }: { item: NewsItem, onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm"
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
        >
          <ArrowLeft size={18} />
          返回资讯列表
        </button>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <Search size={18} />
          </button>
          <button className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:bg-emerald-700">
            分享资讯
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {item.category}
          </span>
          <span className="text-gray-400 text-sm flex items-center gap-1">
            <Calendar size={14} /> {item.publishDate}
          </span>
          <span className="text-gray-400 text-sm flex items-center gap-1">
            <Globe size={14} /> {item.sourceJournal}
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
          {item.title}
        </h1>

        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-2xl mb-10">
          <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">核心结论</h4>
          <p className="text-xl font-medium text-emerald-900 italic">
            “{item.oneSentenceSummary}”
          </p>
        </div>

        <div className="rounded-3xl overflow-hidden mb-12 shadow-2xl">
          <img 
            src={item.conceptImageUrl} 
            alt="AI Generated Concept" 
            className="w-full aspect-video object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="bg-gray-900 p-4 text-center">
            <p className="text-xs text-gray-400 italic">AI 绘图：基于论文核心原理生成的概念示意图</p>
          </div>
        </div>

        <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed space-y-8">
          {item.translatedAbstract && (
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 mb-10">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={22} className="text-emerald-600" />
                研究摘要 (中文翻译)
              </h3>
              <p className="text-gray-700 leading-relaxed italic">
                {item.translatedAbstract}
              </p>
            </div>
          )}
          {item.plainTextContent.split('\n\n').map((para, i) => (
            <p key={i} className="whitespace-pre-wrap">{para}</p>
          ))}
          {item.abstract && (
            <div className="mt-12 pt-8 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Original Abstract (English)</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-mono italic">
                {item.abstract}
              </p>
            </div>
          )}
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
              AI
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">EnvInsight AI 科学记者</p>
              <p className="text-xs text-gray-500">基于 Gemini 3 Flash 模型生成</p>
            </div>
          </div>
          <a 
            href={item.sourceLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
          >
            查看原始论文 <ExternalLink size={16} />
          </a>
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="text-xs text-gray-400 flex items-center gap-2">
            <ShieldAlert size={14} />
            免责声明：本文由 AI 自动翻译并科普化，不代表本平台立场，亦不构成医疗建议。
          </p>
        </div>
      </div>
    </motion.div>
  );
}
