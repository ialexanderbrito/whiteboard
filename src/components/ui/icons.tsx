import React from 'react';
import { HugeiconsIcon, type HugeiconsProps, type IconSvgElement } from '@hugeicons/react';
import {
  AlertCircleIcon,
  TextAlignCenterIcon,
  AlignHorizontalCenterIcon,
  AlignVerticalCenterIcon,
  AlignRightIcon,
  AlignBottomIcon,
  AlignHorizontalDistributeCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  AlignLeftIcon,
  AlignTopIcon,
  DistributeVerticalCenterIcon,
  ArrowDown02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  ArrowUp02Icon,
  ArrowUpRight01Icon,
  TextBoldIcon,
  Select01Icon,
  PackageIcon,
  Briefcase01Icon,
  BringToFrontIcon,
  Calendar03Icon,
  Tick02Icon,
  CheckmarkCircle01Icon,
  CheckmarkSquare01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  CircleIcon,
  Target02Icon,
  ClipboardPasteIcon,
  Clock01Icon,
  Coffee01Icon,
  Compass01Icon,
  Copy01Icon,
  Copy02Icon,
  CrownIcon,
  Target01Icon,
  DiamondIcon,
  Download01Icon,
  PencilEdit02Icon,
  PencilEdit01Icon,
  Eraser01Icon,
  ExternalLinkIcon,
  ViewIcon,
  ViewOffSlashIcon,
  File01Icon,
  FilterIcon,
  KanbanIcon,
  FrameIcon,
  GitBranchIcon,
  Globe02Icon,
  Grid02Icon,
  HandIcon,
  HeadphonesIcon,
  FavouriteIcon,
  HelpCircleIcon,
  HighlighterIcon,
  HistoryIcon,
  ImageAdd01Icon,
  InformationCircleIcon,
  TextItalicIcon,
  Key01Icon,
  KeyboardIcon,
  LaptopIcon,
  Layers01Icon,
  DashboardSquare01Icon,
  LayoutTemplateIcon,
  BulbIcon,
  Link01Icon,
  LeftToRightListBulletIcon,
  Loading03Icon,
  LockKeyIcon,
  Logout01Icon,
  Magnet01Icon,
  MapIcon,
  Medal02Icon,
  Location01Icon,
  ArrowExpand01Icon,
  Comment01Icon,
  ArrowShrink01Icon,
  ArrowShrink02Icon,
  MinusSignIcon,
  MonitorIcon,
  Moon02Icon,
  MoreHorizontalIcon,
  CursorPointer01Icon,
  CursorPointer02Icon,
  CursorMagicSelection01Icon,
  MusicNote01Icon,
  PaintBoardIcon,
  SidebarBottomIcon,
  SidebarLeftIcon,
  PauseIcon,
  PenTool01Icon,
  PenTool02Icon,
  ColorPickerIcon,
  PlayIcon,
  PlusSignIcon,
  QrCodeIcon,
  RadioIcon,
  Redo03Icon,
  RotateLeft01Icon,
  RotateRight01Icon,
  ScissorsIcon,
  Search01Icon,
  TelegramIcon,
  SendToBackIcon,
  Shapes01Icon,
  Share01Icon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SmileIcon,
  SparklesIcon,
  SquareIcon,
  StarIcon,
  NoteIcon,
  StopCircleIcon,
  TextStrikethroughIcon,
  Sun01Icon,
  Timer01Icon,
  Delete02Icon,
  TriangleIcon,
  TrophyIcon,
  Tv01Icon,
  TextIcon,
  TextUnderlineIcon,
  Undo03Icon,
  LockOpenIcon,
  Upload01Icon,
  UserIcon,
  UserEdit01Icon,
  UserMultipleIcon,
  VolumeLowIcon,
  VolumeHighIcon,
  VolumeMute01Icon,
  CheckmarkBadge01Icon,
  MagicWand01Icon,
  Cancel01Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

export interface IconProps extends Omit<HugeiconsProps, 'icon'> {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

export type HugeIconComponent = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

// Compatibility aliases with Lucide types
export type LucideIcon = HugeIconComponent;
export type LucideProps = IconProps;

/**
 * Factory that creates a standardized Stroke Rounded Hugeicon React component.
 * Uses 1.5px stroke width by default for modern refined aesthetics (Emil Kowalski / Linear style),
 * while supporting overrides and native Tailwind className sizing/colors.
 */
export function createHugeIcon(icon: IconSvgElement, displayName: string): HugeIconComponent {
  const IconComponent = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => {
    const { className, strokeWidth = 1.5, ...rest } = props;
    return (
      <HugeiconsIcon
        ref={ref}
        icon={icon}
        strokeWidth={strokeWidth}
        className={cn('shrink-0 select-none inline-block align-middle', className)}
        {...rest}
      />
    );
  });
  IconComponent.displayName = displayName;
  return IconComponent;
}

// Mapped Icons (145 Stroke Rounded Free Icons)
export const AlertCircle = createHugeIcon(AlertCircleIcon, 'AlertCircle');
export const AlignCenter = createHugeIcon(TextAlignCenterIcon, 'AlignCenter');
export const AlignCenterHorizontal = createHugeIcon(AlignHorizontalCenterIcon, 'AlignCenterHorizontal');
export const AlignCenterVertical = createHugeIcon(AlignVerticalCenterIcon, 'AlignCenterVertical');
export const AlignEndHorizontal = createHugeIcon(AlignRightIcon, 'AlignEndHorizontal');
export const AlignEndVertical = createHugeIcon(AlignBottomIcon, 'AlignEndVertical');
export const AlignHorizontalDistributeCenter = createHugeIcon(AlignHorizontalDistributeCenterIcon, 'AlignHorizontalDistributeCenter');
export const AlignLeft = createHugeIcon(TextAlignLeftIcon, 'AlignLeft');
export const AlignRight = createHugeIcon(TextAlignRightIcon, 'AlignRight');
export const AlignStartHorizontal = createHugeIcon(AlignLeftIcon, 'AlignStartHorizontal');
export const AlignStartVertical = createHugeIcon(AlignTopIcon, 'AlignStartVertical');
export const AlignVerticalDistributeCenter = createHugeIcon(DistributeVerticalCenterIcon, 'AlignVerticalDistributeCenter');

export const ArrowDown = createHugeIcon(ArrowDown02Icon, 'ArrowDown');
export const ArrowLeft = createHugeIcon(ArrowLeft02Icon, 'ArrowLeft');
export const ArrowRight = createHugeIcon(ArrowRight02Icon, 'ArrowRight');
export const ArrowUp = createHugeIcon(ArrowUp02Icon, 'ArrowUp');
export const ArrowUpRight = createHugeIcon(ArrowUpRight01Icon, 'ArrowUpRight');

export const Bold = createHugeIcon(TextBoldIcon, 'Bold');
export const BoxSelect = createHugeIcon(Select01Icon, 'BoxSelect');
export const Boxes = createHugeIcon(PackageIcon, 'Boxes');
export const Briefcase = createHugeIcon(Briefcase01Icon, 'Briefcase');
export const BringToFront = createHugeIcon(BringToFrontIcon, 'BringToFront');

export const CalendarDays = createHugeIcon(Calendar03Icon, 'CalendarDays');
export const Check = createHugeIcon(Tick02Icon, 'Check');
export const CheckCircle2 = createHugeIcon(CheckmarkCircle01Icon, 'CheckCircle2');
export const CheckSquare = createHugeIcon(CheckmarkSquare01Icon, 'CheckSquare');
export const ChevronDown = createHugeIcon(ArrowDown01Icon, 'ChevronDown');
export const ChevronLeft = createHugeIcon(ArrowLeft01Icon, 'ChevronLeft');
export const ChevronRight = createHugeIcon(ArrowRight01Icon, 'ChevronRight');
export const ChevronUp = createHugeIcon(ArrowUp01Icon, 'ChevronUp');

export const Circle = createHugeIcon(CircleIcon, 'Circle');
export const CircleDot = createHugeIcon(Target02Icon, 'CircleDot');
export const ClipboardPaste = createHugeIcon(ClipboardPasteIcon, 'ClipboardPaste');
export const Clock = createHugeIcon(Clock01Icon, 'Clock');
export const Coffee = createHugeIcon(Coffee01Icon, 'Coffee');
export const Compass = createHugeIcon(Compass01Icon, 'Compass');
export const Copy = createHugeIcon(Copy01Icon, 'Copy');
export const Crown = createHugeIcon(CrownIcon, 'Crown');
export const CopyPlus = createHugeIcon(Copy02Icon, 'CopyPlus');
export const Crosshair = createHugeIcon(Target01Icon, 'Crosshair');

export const Diamond = createHugeIcon(DiamondIcon, 'Diamond');
export const Download = createHugeIcon(Download01Icon, 'Download');
export const Edit2 = createHugeIcon(PencilEdit02Icon, 'Edit2');
export const Edit3 = createHugeIcon(PencilEdit01Icon, 'Edit3');
export const Eraser = createHugeIcon(Eraser01Icon, 'Eraser');
export const ExternalLink = createHugeIcon(ExternalLinkIcon, 'ExternalLink');
export const Eye = createHugeIcon(ViewIcon, 'Eye');
export const EyeOff = createHugeIcon(ViewOffSlashIcon, 'EyeOff');

export const FileText = createHugeIcon(File01Icon, 'FileText');
export const Filter = createHugeIcon(FilterIcon, 'Filter');
export const FolderKanban = createHugeIcon(KanbanIcon, 'FolderKanban');
export const Frame = createHugeIcon(FrameIcon, 'Frame');

export const GitBranch = createHugeIcon(GitBranchIcon, 'GitBranch');
export const Globe = createHugeIcon(Globe02Icon, 'Globe');
export const Grid = createHugeIcon(Grid02Icon, 'Grid');

export const Hand = createHugeIcon(HandIcon, 'Hand');
export const Headphones = createHugeIcon(HeadphonesIcon, 'Headphones');
export const Heart = createHugeIcon(FavouriteIcon, 'Heart');
export const HelpCircle = createHugeIcon(HelpCircleIcon, 'HelpCircle');
export const Highlighter = createHugeIcon(HighlighterIcon, 'Highlighter');
export const History = createHugeIcon(HistoryIcon, 'History');

export const ImagePlus = createHugeIcon(ImageAdd01Icon, 'ImagePlus');
export const Info = createHugeIcon(InformationCircleIcon, 'Info');
export const Italic = createHugeIcon(TextItalicIcon, 'Italic');

export const KeyRound = createHugeIcon(Key01Icon, 'KeyRound');
export const Keyboard = createHugeIcon(KeyboardIcon, 'Keyboard');

// Ícone autêntico de Apontador Laser desenhado no estilo Stroke Rounded (24x24, traço 1.5px e cantos arredondados)
const LaserPointerIcon: IconSvgElement = [
  ['path', { d: 'M13 11L7.5 16.5', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '1.5', key: '0' }],
  ['path', { d: 'M17 5L19 7', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '1.5', key: '1' }],
  ['path', { d: 'M18.8 2.8C19.7 3.7 19.7 5.1 18.8 6L14 10.8C13.5 11.3 12.7 11.3 12.2 10.8L10.2 8.8C9.7 8.3 9.7 7.5 10.2 7L15 2.2C15.9 1.3 17.3 1.3 18.2 2.2L18.8 2.8Z', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '1.5', key: '2' }],
  ['path', { d: 'M3 15H5', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '1.5', key: '3' }],
  ['path', { d: 'M4 20L5.5 18.5', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '1.5', key: '4' }],
  ['path', { d: 'M9 21V19', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '1.5', key: '5' }],
  ['circle', { cx: '4', cy: '20', r: '1', fill: 'currentColor', stroke: 'currentColor', strokeWidth: '1.5', key: '6' }],
];

export const Laptop = createHugeIcon(LaptopIcon, 'Laptop');
export const Laser = createHugeIcon(LaserPointerIcon, 'Laser');
export const Layers = createHugeIcon(Layers01Icon, 'Layers');
export const LayoutGrid = createHugeIcon(DashboardSquare01Icon, 'LayoutGrid');
export const LayoutTemplate = createHugeIcon(LayoutTemplateIcon, 'LayoutTemplate');
export const Lightbulb = createHugeIcon(BulbIcon, 'Lightbulb');
export const Link2 = createHugeIcon(Link01Icon, 'Link2');
export const List = createHugeIcon(LeftToRightListBulletIcon, 'List');
export const Loader2 = createHugeIcon(Loading03Icon, 'Loader2');
export const Lock = createHugeIcon(LockKeyIcon, 'Lock');
export const LogOut = createHugeIcon(Logout01Icon, 'LogOut');
export const Magnet = createHugeIcon(Magnet01Icon, 'Magnet');

export const Map = createHugeIcon(MapIcon, 'Map');
export const MapPin = createHugeIcon(Location01Icon, 'MapPin');
export const Maximize2 = createHugeIcon(ArrowExpand01Icon, 'Maximize2');
export const MessageSquare = createHugeIcon(Comment01Icon, 'MessageSquare');
export const Minimize = createHugeIcon(ArrowShrink01Icon, 'Minimize');
export const Minimize2 = createHugeIcon(ArrowShrink02Icon, 'Minimize2');
export const Minus = createHugeIcon(MinusSignIcon, 'Minus');
export const Monitor = createHugeIcon(MonitorIcon, 'Monitor');
export const Moon = createHugeIcon(Moon02Icon, 'Moon');
export const MoreHorizontal = createHugeIcon(MoreHorizontalIcon, 'MoreHorizontal');
export const MousePointer = createHugeIcon(CursorPointer01Icon, 'MousePointer');
export const MousePointer2 = createHugeIcon(CursorPointer02Icon, 'MousePointer2');
export const MousePointerClick = createHugeIcon(CursorMagicSelection01Icon, 'MousePointerClick');
export const Music = createHugeIcon(MusicNote01Icon, 'Music');

export const Palette = createHugeIcon(PaintBoardIcon, 'Palette');
export const PanelBottom = createHugeIcon(SidebarBottomIcon, 'PanelBottom');
export const PanelLeft = createHugeIcon(SidebarLeftIcon, 'PanelLeft');
export const Pause = createHugeIcon(PauseIcon, 'Pause');
export const Pen = createHugeIcon(PenTool01Icon, 'Pen');
export const PenTool = createHugeIcon(PenTool02Icon, 'PenTool');
export const Pencil = createHugeIcon(PencilEdit02Icon, 'Pencil');
export const Pipette = createHugeIcon(ColorPickerIcon, 'Pipette');
export const Play = createHugeIcon(PlayIcon, 'Play');
export const Plus = createHugeIcon(PlusSignIcon, 'Plus');

export const QrCode = createHugeIcon(QrCodeIcon, 'QrCode');
export const Radio = createHugeIcon(RadioIcon, 'Radio');
export const Redo2 = createHugeIcon(Redo03Icon, 'Redo2');
export const RotateCcw = createHugeIcon(RotateLeft01Icon, 'RotateCcw');
export const RotateCw = createHugeIcon(RotateRight01Icon, 'RotateCw');

export const Scissors = createHugeIcon(ScissorsIcon, 'Scissors');
export const Search = createHugeIcon(Search01Icon, 'Search');
export const Send = createHugeIcon(TelegramIcon, 'Send');
export const SendToBack = createHugeIcon(SendToBackIcon, 'SendToBack');
export const Shapes = createHugeIcon(Shapes01Icon, 'Shapes');
export const Share2 = createHugeIcon(Share01Icon, 'Share2');
export const ShieldAlert = createHugeIcon(ShieldAlertIcon, 'ShieldAlert');
export const ShieldCheck = createHugeIcon(ShieldCheckIcon, 'ShieldCheck');
export const SlidersHorizontal = createHugeIcon(SlidersHorizontalIcon, 'SlidersHorizontal');
export const Smile = createHugeIcon(SmileIcon, 'Smile');
export const Sparkles = createHugeIcon(SparklesIcon, 'Sparkles');
export const Square = createHugeIcon(SquareIcon, 'Square');
export const SquareCheck = createHugeIcon(CheckmarkSquare01Icon, 'SquareCheck');
export const Star = createHugeIcon(StarIcon, 'Star');
export const StickyNote = createHugeIcon(NoteIcon, 'StickyNote');
export const StopCircle = createHugeIcon(StopCircleIcon, 'StopCircle');
export const Strikethrough = createHugeIcon(TextStrikethroughIcon, 'Strikethrough');
export const Sun = createHugeIcon(Sun01Icon, 'Sun');

export const Target = createHugeIcon(Target01Icon, 'Target');
export const Timer = createHugeIcon(Timer01Icon, 'Timer');
export const Medal = createHugeIcon(Medal02Icon, 'Medal');
export const Trash2 = createHugeIcon(Delete02Icon, 'Trash2');
export const Triangle = createHugeIcon(TriangleIcon, 'Triangle');
export const Trophy = createHugeIcon(TrophyIcon, 'Trophy');
export const Tv = createHugeIcon(Tv01Icon, 'Tv');
export const Type = createHugeIcon(TextIcon, 'Type');

export const Underline = createHugeIcon(TextUnderlineIcon, 'Underline');
export const Undo2 = createHugeIcon(Undo03Icon, 'Undo2');
export const Unlock = createHugeIcon(LockOpenIcon, 'Unlock');
export const Upload = createHugeIcon(Upload01Icon, 'Upload');
export const User = createHugeIcon(UserIcon, 'User');
export const UserPen = createHugeIcon(UserEdit01Icon, 'UserPen');
export const Users = createHugeIcon(UserMultipleIcon, 'Users');

export const Volume1 = createHugeIcon(VolumeLowIcon, 'Volume1');
export const Volume2 = createHugeIcon(VolumeHighIcon, 'Volume2');
export const VolumeX = createHugeIcon(VolumeMute01Icon, 'VolumeX');
export const Vote = createHugeIcon(CheckmarkBadge01Icon, 'Vote');

export const Wand2 = createHugeIcon(MagicWand01Icon, 'Wand2');
export const X = createHugeIcon(Cancel01Icon, 'X');
export const ZoomIn = createHugeIcon(ZoomInIcon, 'ZoomIn');
export const ZoomOut = createHugeIcon(ZoomOutIcon, 'ZoomOut');
