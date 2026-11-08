import React from 'react';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FollowUserBannerProps {
  followingUserName: string;
  onStopFollowing: () => void;
}

export const FollowUserBanner: React.FC<FollowUserBannerProps> = ({
  followingUserName,
  onStopFollowing,
}) => {
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 animate-in fade-in-0 slide-in-from-top-2 duration-150">
      <div className="flex items-center gap-2 bg-popover/90 text-popover-foreground backdrop-blur-md px-3 py-1.5 rounded-md shadow-sm border border-border">
        <span className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
        </span>
        <Eye className="size-3.5 text-emerald-500" />
        <span className="text-xs">
          Seguindo <strong className="font-semibold">{followingUserName}</strong>
        </span>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">• ESC para sair</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onStopFollowing}
          className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground rounded ml-1"
        >
          <X className="size-3 mr-1" />
          Parar
        </Button>
      </div>
    </div>
  );
};
