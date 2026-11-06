import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Share2, 
  Sparkles, 
  ExternalLink, 
  LogOut, 
  LayoutGrid, 
  Clock, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { boardService } from '../services/boardService';
import type { Board } from '../types/board';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isConfigured, logout } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = boardService.subscribeBoards((list) => {
      setBoards(list);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateBoard = async () => {
    if (!currentUser || isCreating) return;
    setIsCreating(true);
    try {
      const boardId = await boardService.createBoard('Novo Quadro de Ideias', currentUser);
      navigate(`/board/${boardId}`);
    } catch (e) {
      console.error('Erro ao criar quadro:', e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBoard = async (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este quadro?')) {
      await boardService.deleteBoard(boardId);
    }
  };

  const handleCopyLink = (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/board/${boardId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(boardId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra de Navegação do Dashboard */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-black text-xl text-blue-600 tracking-tight">
            <Sparkles size={24} className="fill-blue-600" />
            <span>Mirio</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 py-1.5 px-3 rounded-full">
              <div
                className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-sm"
                style={{ backgroundColor: currentUser?.color || '#3b82f6' }}
              >
                {currentUser?.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-slate-700">
                {currentUser?.displayName}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sair"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-xl transition"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Alerta informativo sobre o Firebase se não configurado */}
      {!isConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 py-3 px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-3 text-amber-800 text-sm">
            <AlertCircle size={18} className="shrink-0 text-amber-600" />
            <span>
              <strong>Modo Local / Demonstração ativo:</strong> Para sincronizar em tempo real pela nuvem com seu time, adicione as chaves do seu projeto Firebase no arquivo <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-xs">.env</code>.
            </span>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quadros da Equipe</h1>
            <p className="text-slate-500 text-sm mt-1">
              Crie lousas em branco para brainstormings, retrospectivas e diagramas colaborativos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateBoard}
            disabled={isCreating}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
          >
            <Plus size={20} />
            <span>{isCreating ? 'Criando...' : 'Novo Quadro'}</span>
          </button>
        </div>

        {/* Grade de Quadros */}
        {boards.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center max-w-lg mx-auto my-12">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LayoutGrid size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum quadro criado ainda</h3>
            <p className="text-slate-500 text-sm mb-6">
              Comece agora criando seu primeiro quadro e convide seu time para colaborar.
            </p>
            <button
              type="button"
              onClick={handleCreateBoard}
              disabled={isCreating}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition"
            >
              <Plus size={18} />
              <span>Criar Primeiro Quadro</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {boards.map((b) => (
              <div
                key={b.id}
                onClick={() => navigate(`/board/${b.id}`)}
                className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition cursor-pointer flex flex-col overflow-hidden"
              >
                {/* Thumbnail / Header do Card */}
                <div className="h-32 bg-slate-100 flex items-center justify-center border-b border-slate-100 group-hover:bg-blue-50/50 transition relative">
                  <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition">
                    <div className="w-8 h-8 rounded bg-yellow-200 shadow-sm -rotate-6" />
                    <div className="w-8 h-8 rounded bg-green-200 shadow-sm rotate-3" />
                    <div className="w-8 h-8 rounded bg-blue-200 shadow-sm rotate-12" />
                  </div>

                  <span className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-lg text-slate-400 group-hover:text-blue-600 transition">
                    <ExternalLink size={14} />
                  </span>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 truncate mb-1 group-hover:text-blue-600 transition">
                      {b.title}
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      <span>{new Date(b.updatedAt).toLocaleDateString('pt-BR')}</span>
                      <span>• por {b.ownerName}</span>
                    </p>
                  </div>

                  {/* Ações Rápidas no Card */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(e, b.id)}
                      title="Copiar Link Compartilhável"
                      className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-slate-100 transition"
                    >
                      {copiedId === b.id ? (
                        <>
                          <Check size={14} className="text-emerald-500" />
                          <span className="text-emerald-600 font-medium">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={14} />
                          <span>Compartilhar</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteBoard(e, b.id)}
                      title="Excluir Quadro"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
