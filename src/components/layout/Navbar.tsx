import React, { useState } from 'react';
import { ArrowLeft, Share2, Check, Sparkles, LogOut } from 'lucide-react';
import type { CurrentUser, UserPresence } from '../../types/board';

interface NavbarProps {
  title: string;
  onUpdateTitle: (newTitle: string) => void;
  onBackToDashboard: () => void;
  currentUser: CurrentUser;
  remoteUsers: UserPresence[];
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  onUpdateTitle,
  onBackToDashboard,
  currentUser,
  remoteUsers,
  onLogout,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [copied, setCopied] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim() && tempTitle !== title) {
      onUpdateTitle(tempTitle.trim());
    } else {
      setTempTitle(title);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Falha ao copiar:', e);
    }
  };

  return (
    <header className="absolute top-4 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
      {/* Lado Esquerdo: Logo, Voltar e Título */}
      <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-slate-200/80 pointer-events-auto">
        <button
          type="button"
          onClick={onBackToDashboard}
          title="Voltar ao Painel"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Marca Mirio */}
        <div className="flex items-center gap-1.5 font-black text-blue-600 tracking-tight text-lg pr-2 border-r border-slate-200">
          <Sparkles size={18} className="fill-blue-600" />
          <span>Mirio</span>
        </div>

        {/* Título Editável */}
        {isEditingTitle ? (
          <input
            autoFocus
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') {
                setTempTitle(title);
                setIsEditingTitle(false);
              }
            }}
            className="text-sm font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg outline-none border border-blue-500 max-w-[200px] sm:max-w-[300px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTempTitle(title);
              setIsEditingTitle(true);
            }}
            title="Clique para renomear o quadro"
            className="text-sm font-semibold text-slate-800 hover:bg-slate-100 px-2 py-1 rounded-lg transition text-left truncate max-w-[180px] sm:max-w-[260px]"
          >
            {title}
          </button>
        )}
      </div>

      {/* Lado Direito: Membros Online, Compartilhar e Perfil */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Avatares dos Usuários Conectados */}
        <div className="flex items-center bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-slate-200/80 gap-1.5">
          {/* Avatar do próprio usuário */}
          <div
            title={`Você (${currentUser.displayName})`}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white"
            style={{ backgroundColor: currentUser.color }}
          >
            {currentUser.displayName.charAt(0).toUpperCase()}
          </div>

          {/* Avatares dos colegas online */}
          {remoteUsers.slice(0, 4).map((user) => (
            <div
              key={user.userId}
              title={user.name}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white"
              style={{ backgroundColor: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}

          {remoteUsers.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold ring-2 ring-white">
              +{remoteUsers.length - 4}
            </div>
          )}
        </div>

        {/* Botão de Compartilhar Link */}
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-blue-500/25 transition"
        >
          {copied ? (
            <>
              <Check size={16} />
              <span>Link Copiado!</span>
            </>
          ) : (
            <>
              <Share2 size={16} />
              <span>Compartilhar</span>
            </>
          )}
        </button>

        {/* Botão Sair */}
        <button
          type="button"
          onClick={onLogout}
          title="Sair da Conta"
          className="p-2.5 bg-white/95 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-2xl shadow-lg border border-slate-200/80 transition"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
