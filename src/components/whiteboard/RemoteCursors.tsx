import React from 'react';
import type { UserPresence } from '../../types/board';

interface RemoteCursorsProps {
  remoteUsers: UserPresence[];
  stageX: number;
  stageY: number;
  scale: number;
}

export const RemoteCursors: React.FC<RemoteCursorsProps> = ({
  remoteUsers,
  stageX,
  stageY,
  scale,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {remoteUsers.map((user) => {
        if (!user.cursor) return null;

        // Converte coordenadas do canvas (world) para a tela (screen)
        const screenX = user.cursor.x * scale + stageX;
        const screenY = user.cursor.y * scale + stageY;

        return (
          <div
            key={user.userId}
            className="absolute transition-all duration-75 ease-out flex items-start gap-1"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              transform: 'translate(0, 0)',
            }}
          >
            {/* Ícone do Cursor Estilo Miro */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-sm filter"
              style={{ color: user.color }}
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.2"
              />
            </svg>

            {/* Tag com Nome do Colega */}
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full text-white shadow-sm whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
