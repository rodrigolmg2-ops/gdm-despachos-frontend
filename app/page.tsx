'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppStore } from '@/lib/store';
import {
  FileUp,
  Zap,
  History,
  Settings,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  Trash2,
} from 'lucide-react';

interface Analysis {
  id: string;
  timestamp: string;
  processText: string;
  enquadramento: {
    tipo: string;
    objeto: string;
    fase: string;
    destinatario: string;
    modelo: string;
  };
  alertas: string[];
  minuta: string;
  savedFile?: {
    id: string;
    link: string;
    name: string;
  };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'history' | 'setup'>('analyze');
  const [processText, setProcessText] = useState('');
  const [playbook, setPlaybook] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [folderLink, setFolderLink] = useState('');
  const [health, setHealth] = useState<any>(null);

  const {
    apiUrl,
    setApiUrl,
    analyses,
    addAnalysis,
    clearAnalyses,
    folderIdConfigured,
    setFolderIdConfigured,
  } = useAppStore();

  // Carregar playbook armazenado
  useEffect(() => {
    const stored = localStorage.getItem('gdmPlaybook');
    if (stored) setPlaybook(stored);
  }, []);

  // Verificar health do backend
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/health`);
        setHealth(res.data);
        setFolderIdConfigured(res.data.folderConfigured);
      } catch (err) {
        console.error('Backend não respondendo:', err);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [apiUrl, setFolderIdConfigured]);

  // Setup
  const handleSetup = async () => {
    if (!folderLink) {
      toast.error('Coloque o link da pasta');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${apiUrl}/api/setup`, {
        folderLink,
      });

      // Indexar modelos e acervo
      await axios.post(`${apiUrl}/api/index-models`);
      await axios.post(`${apiUrl}/api/index-acervo`);

      setFolderIdConfigured(true);
      toast.success('✅ Pasta configurada e indexada!');
      setFolderLink('');
      setActiveTab('analyze');
    } catch (err: any) {
      toast.error(`Erro: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Salvar playbook
  const handleSavePlaybook = () => {
    if (!playbook) {
      toast.error('Cole o playbook');
      return;
    }
    localStorage.setItem('gdmPlaybook', playbook);
    toast.success('✅ Playbook salvo!');
  };

  // Analisar processo
  const handleAnalyze = async () => {
    if (!playbook) {
      toast.error('Carregue o playbook primeiro');
      return;
    }

    if (!processText && !pdfFile) {
      toast.error('Cole o texto do processo ou envie um PDF');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();

      if (processText) {
        formData.append('processText', processText);
      }
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }
      formData.append('playbook', playbook);

      const res = await axios.post(`${apiUrl}/api/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = res.data;
      const parsed = parseAnalysis(data.analysis);

      const analysisObj: Analysis = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        processText: processText || `PDF: ${pdfFile?.name}`,
        enquadramento: parsed.enquadramento,
        alertas: parsed.alertas,
        minuta: parsed.minuta,
        savedFile: data.savedFile,
      };

      addAnalysis(analysisObj);
      setAnalysis(analysisObj);
      toast.success('✅ Processo analisado com sucesso!');
    } catch (err: any) {
      toast.error(`Erro: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Parser do resultado da análise
  const parseAnalysis = (text: string) => {
    const enquadramentoMatch = text.match(/### ENQUADRAMENTO([\s\S]*?)(?=###|$)/);
    const alertasMatch = text.match(/### ALERTAS E INCONSISTÊNCIAS([\s\S]*?)(?=###|$)/);
    const minutaMatch = text.match(/### MINUTA DO DESPACHO([\s\S]*?)$/);

    const enquadramento = parseEnquadramento(enquadramentoMatch?.[1] || '');
    const alertas = (alertasMatch?.[1] || '')
      .split('\n')
      .filter((l) => l.trim())
      .filter((l) => l.includes('[ALERTA]') || l.includes('**'));

    return {
      enquadramento,
      alertas,
      minuta: minutaMatch?.[1]?.trim() || text,
    };
  };

  const parseEnquadramento = (text: string) => {
    const extract = (label: string) => {
      const match = text.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
      return match ? match[1].trim() : '';
    };

    return {
      tipo: extract('Tipo de processo'),
      objeto: extract('Objeto'),
      fase: extract('Fase atual'),
      destinatario: extract('Destinatário do despacho'),
      modelo: extract('Modelo GDM aplicável'),
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('📋 Copiado!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">🏛️ GDM Despachos</h1>
        <p className="text-slate-300">Automação inteligente de despachos do Gabinete da Diretoria de Materiais</p>
      </div>

      {/* Status Backend */}
      {health && (
        <div className="mb-6 p-4 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="flex-1">
            <p className="text-sm text-slate-300">
              Backend: <span className="font-mono text-white">{apiUrl}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Modelos: {health.modelsCount} | Acervo: {health.acervoCount}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-3 mb-8 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('analyze')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'analyze'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Zap className="inline mr-2 w-4 h-4" />
          Analisar
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <History className="inline mr-2 w-4 h-4" />
          Histórico ({analyses.length})
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'setup'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Settings className="inline mr-2 w-4 h-4" />
          Setup
        </button>
      </div>

      {/* TAB: ANALYZE */}
      {activeTab === 'analyze' && (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Entrada */}
          <div className="space-y-6">
            {/* Playbook */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-4">📚 Playbook Operacional</h2>
              <textarea
                value={playbook}
                onChange={(e) => setPlaybook(e.target.value)}
                placeholder="Cole o playbook completo aqui..."
                className="w-full h-32 bg-slate-900 border border-slate-600 rounded p-3 text-white text-sm focus:outline-none focus:border-blue-400 resize-none"
              />
              <button
                onClick={handleSavePlaybook}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors"
              >
                💾 Salvar Playbook
              </button>
              <p className="text-xs text-slate-400 mt-2">
                {playbook.length > 0
                  ? `✅ ${playbook.split(/\s+/).length} palavras`
                  : '⚠️ Nenhum playbook carregado'}
              </p>
            </div>

            {/* Processo */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-4">📄 Processo a Analisar</h2>

              {/* Texto */}
              <textarea
                value={processText}
                onChange={(e) => setProcessText(e.target.value)}
                placeholder="Cole o conteúdo do processo aqui..."
                className="w-full h-40 bg-slate-900 border border-slate-600 rounded p-3 text-white text-sm focus:outline-none focus:border-blue-400 resize-none mb-4"
              />

              {/* PDF */}
              <div className="mb-4">
                <label className="block text-sm text-slate-300 mb-2">Ou envie um PDF:</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="block w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white cursor-pointer"
                />
                {pdfFile && <p className="text-xs text-green-400 mt-2">✅ {pdfFile.name}</p>}
              </div>

              {/* Botão Analisar */}
              <button
                onClick={handleAnalyze}
                disabled={loading || !folderIdConfigured}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white py-3 rounded font-bold transition-all"
              >
                {loading ? '⏳ Analisando...' : '🔍 Analisar Processo'}
              </button>

              {!folderIdConfigured && (
                <p className="text-xs text-yellow-400 mt-2">⚠️ Configure a pasta primeiro na aba Setup</p>
              )}
            </div>
          </div>

          {/* Resultado */}
          {analysis && (
            <div className="space-y-6">
              {/* Enquadramento */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-lg font-bold text-white mb-4">🎯 Enquadramento</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400">Tipo</p>
                    <p className="text-white font-medium">{analysis.enquadramento.tipo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Objeto</p>
                    <p className="text-white font-medium">{analysis.enquadramento.objeto}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Fase</p>
                      <p className="text-white font-medium">{analysis.enquadramento.fase}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Destinatário</p>
                      <p className="text-white font-medium">{analysis.enquadramento.destinatario}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Modelo GDM</p>
                    <p className="text-blue-400 font-mono">{analysis.enquadramento.modelo}</p>
                  </div>
                </div>
              </div>

              {/* Alertas */}
              {analysis.alertas.length > 0 && (
                <div className="bg-yellow-900/20 rounded-lg p-6 border border-yellow-700/50">
                  <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Alertas
                  </h3>
                  <ul className="space-y-2">
                    {analysis.alertas.map((alerta, i) => (
                      <li key={i} className="text-sm text-yellow-200">
                        • {alerta}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Minuta */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">📝 Minuta do Despacho</h3>
                  <button
                    onClick={() => copyToClipboard(analysis.minuta)}
                    className="p-2 hover:bg-slate-700 rounded transition-colors"
                    title="Copiar"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <pre className="bg-slate-900 p-4 rounded text-slate-300 text-xs overflow-auto max-h-64">
                  {analysis.minuta}
                </pre>

                {analysis.savedFile && (
                  <div className="mt-4 p-3 bg-green-900/20 rounded border border-green-700/50">
                    <p className="text-sm text-green-300 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Salvo no Drive
                    </p>
                    <a
                      href={analysis.savedFile.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:underline flex items-center gap-1 mt-2"
                    >
                      {analysis.savedFile.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {analyses.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400">Nenhuma análise ainda</p>
            </div>
          ) : (
            <>
              {analyses.map((a) => (
                <div
                  key={a.id}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => setAnalysis(a)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-mono text-sm text-slate-300">
                        {new Date(a.timestamp).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-white font-medium mt-1">{a.enquadramento.tipo}</p>
                      <p className="text-sm text-slate-400">{a.enquadramento.objeto}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded text-xs font-mono">
                      {a.enquadramento.modelo}
                    </span>
                  </div>
                  {a.savedFile && (
                    <a
                      href={a.savedFile.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver no Drive
                    </a>
                  )}
                </div>
              ))}
              <button
                onClick={() => clearAnalyses()}
                className="w-full mt-4 py-2 text-red-400 hover:bg-red-900/20 rounded transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Limpar histórico
              </button>
            </>
          )}
        </div>
      )}

      {/* TAB: SETUP */}
      {activeTab === 'setup' && (
        <div className="max-w-md mx-auto space-y-6">
          {/* API URL */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">⚙️ Configuração do Backend</h2>
            <label className="block text-sm text-slate-300 mb-2">URL do Backend:</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white text-sm focus:outline-none focus:border-blue-400"
              placeholder="http://localhost:3001"
            />
            <p className="text-xs text-slate-400 mt-2">
              Padrão: {process.env.NEXT_PUBLIC_API_URL}
            </p>
          </div>

          {/* Folder Setup */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">📁 Configurar Pasta Google Drive</h2>
            <label className="block text-sm text-slate-300 mb-2">Link da Pasta /Despacho GDM:</label>
            <input
              type="text"
              value={folderLink}
              onChange={(e) => setFolderLink(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white text-sm focus:outline-none focus:border-blue-400 mb-4"
              placeholder="https://drive.google.com/drive/folders/..."
            />
            <button
              onClick={handleSetup}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white py-3 rounded font-bold transition-colors"
            >
              {loading ? '⏳ Configurando...' : '✅ Configurar Pasta'}
            </button>
            {folderIdConfigured && (
              <div className="mt-4 p-3 bg-green-900/20 rounded border border-green-700/50">
                <p className="text-sm text-green-300 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Pasta configurada e indexada
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-900/20 rounded-lg p-6 border border-blue-700/50">
            <h3 className="text-white font-bold mb-3">ℹ️ Informações Importantes</h3>
            <ul className="text-sm text-blue-200 space-y-2">
              <li>✅ Compartilhe a pasta /Despacho GDM com a Service Account do Google</li>
              <li>✅ Certifique-se de que os modelos (A1, B1, etc) estão em PDF</li>
              <li>✅ O acervo de processos deve estar em uma subpasta chamada "acervo de processos"</li>
              <li>✅ Os despachos gerados serão salvos em "Despachos Gerados"</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
