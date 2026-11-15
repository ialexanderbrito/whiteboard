import React from 'react';
import { Group, Rect, Path, Circle } from 'react-konva';

/**
 * Badge de "Elemento Bloqueado" para o canvas Konva.
 * ---------------------------------------------------
 * Substitui o emoji 🔒 (que varia por sistema operacional) pelo glifo de
 * cadeado clássico do set HugeIcons ("LockKeyhole", viewBox 24, stroke 1.5),
 * desenhado nativamente com primitivas Konva para escalar com o zoom e ficar
 * idêntico em todas as plataformas.
 */

// Alça do cadeado (HugeIcons LockKeyholeIcon, path 0)
const LOCK_SHACKLE_PATH =
  'M16.4964 9V6.5C16.4964 4.01472 14.4817 2 11.9964 2C9.51112 2 7.4964 4.01472 7.4964 6.5V9';

// Corpo do cadeado (HugeIcons LockKeyholeIcon, path 1)
const LOCK_BODY_PATH =
  'M13.4958 9H10.4964C8.16158 9 6.99417 9 6.11049 9.47237C5.41275 9.84535 4.84128 10.4169 4.46837 11.1146C3.99608 11.9984 3.99619 13.1658 3.99641 15.5006C3.99662 17.835 3.99673 19.0023 4.46907 19.8858C4.84203 20.5835 5.41347 21.1548 6.11115 21.5277C6.99475 22 8.16197 22 10.4964 22H13.4958C15.8304 22 16.9978 22 17.8814 21.5277C18.5791 21.1548 19.1506 20.5833 19.5235 19.8856C19.9958 19.0019 19.9958 17.8346 19.9958 15.5C19.9958 13.1654 19.9958 11.9981 19.5235 11.1144C19.1506 10.4167 18.5791 9.84525 17.8814 9.47231C16.9978 9 15.8304 9 13.4958 9Z';

// Furo da fechadura (HugeIcons LockKeyholeIcon, círculo central)
const KEYHOLE_CX = 11.9964;
const KEYHOLE_CY = 15.5;
const KEYHOLE_R = 2;

const ICON_STROKE = 'rgba(255, 255, 255, 0.95)';

interface LockBadgeProps {
  /** Posição do canto superior esquerdo do badge (coordenadas do elemento). */
  x: number;
  y: number;
  /** Lado do badge quadrado em px. Padrão 18. */
  size?: number;
  /** Desenha o fundo escuro arredondado (desative sobre fundos já escuros). */
  background?: boolean;
}

export const LockBadge: React.FC<LockBadgeProps> = ({
  x,
  y,
  size = 18,
  background = true,
}) => {
  const iconScale = (size * 0.61) / 24;
  const offset = (size - 24 * iconScale) / 2;

  return (
    <Group x={x} y={y} listening={false} name="lock-badge">
      {background && (
        <Rect
          width={size}
          height={size}
          fill="rgba(0, 0, 0, 0.4)"
          cornerRadius={3}
          listening={false}
        />
      )}
      <Group
        x={offset}
        y={offset}
        scaleX={iconScale}
        scaleY={iconScale}
        listening={false}
      >
        <Path
          data={LOCK_SHACKLE_PATH}
          stroke={ICON_STROKE}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          listening={false}
        />
        <Path
          data={LOCK_BODY_PATH}
          stroke={ICON_STROKE}
          strokeWidth={1.5}
          strokeLinejoin="round"
          listening={false}
        />
        <Circle
          x={KEYHOLE_CX}
          y={KEYHOLE_CY}
          radius={KEYHOLE_R}
          stroke={ICON_STROKE}
          strokeWidth={1.5}
          listening={false}
        />
      </Group>
    </Group>
  );
};
