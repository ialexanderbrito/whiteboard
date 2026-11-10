import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CanvasElement, TextRun } from '../../types/element';
import {
  RICH_TEXT_FONT_FAMILY,
  RICH_TEXT_LINK_COLOR,
  getElementBaseStyle,
  getElementRuns,
  htmlToRichRuns,
  normalizeColor,
  runsToHtml,
  runsToPlainText,
} from '../../utils/richText';
import {
  textEditingBridge,
  type ActiveTextEditor,
  type TextSelectionInfo,
} from '../../utils/textEditingBridge';
import {
  getViewport,
  subscribeViewport,
  type ViewportState,
} from '../../utils/viewport';

export interface RichTextFinishPayload {
  runs: TextRun[];
  text: string;
  width: number;
  x: number;
  y?: number;
  height: number;
}

interface RichTextEditorProps {
  element: CanvasElement;
  scale: number;
  stagePos: { x: number; y: number };
  selectionColor: string;
  onFinish: (payload: RichTextFinishPayload) => void;
  onRequestLink: (selection: TextSelectionInfo | null) => void;
}

const LINK_MODIFIER_KEYS = new Set(['l', 'k']);

function getWordAtPosition(
  node: Node | null,
  offset: number
): { node: Text; start: number; end: number } | null {
  if (!node) return null;

  let textNode: Text | null = null;
  let caret = offset;

  if (node.nodeType === Node.TEXT_NODE) {
    textNode = node as Text;
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Range pode apontar para um elemento (ex.: linha vazia). Procura o
    // primeiro nó de texto próximo da posição informada.
    const element = node as HTMLElement;
    const childIndex = Math.max(0, Math.min(offset, element.childNodes.length - 1));
    const candidates = [element.childNodes[childIndex], element.childNodes[childIndex - 1]];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (candidate.nodeType === Node.TEXT_NODE) {
        textNode = candidate as Text;
        caret = textNode.length;
        break;
      }
      const walker = document.createTreeWalker(candidate, NodeFilter.SHOW_TEXT);
      const firstText = walker.nextNode() as Text | null;
      if (firstText) {
        textNode = firstText;
        caret = 0;
        break;
      }
    }
  }

  if (!textNode) return null;

  const text = textNode.nodeValue || '';
  let start = Math.max(0, Math.min(caret, text.length));
  let end = start;
  while (start > 0 && /\S/.test(text[start - 1])) start -= 1;
  while (end < text.length && /\S/.test(text[end])) end += 1;

  if (start === end) return null;
  return { node: textNode, start, end };
}

function getWordAtCaret(): { node: Text; start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  return getWordAtPosition(selection.anchorNode, selection.anchorOffset);
}

function getWordFromRange(range: Range | null): { node: Text; start: number; end: number } | null {
  if (!range) return null;
  return getWordAtPosition(range.startContainer, range.startOffset);
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  element,
  scale,
  stagePos,
  selectionColor,
  onFinish,
  onRequestLink,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const finishedRef = useRef(false);
  const finishRef = useRef<() => void>(() => {});
  const syncHeightRef = useRef<() => void>(() => {});

  const [boxWidth, setBoxWidth] = useState(Math.max(40, element.width || 220));
  const [boxX, setBoxX] = useState(element.x);
  const [boxY, setBoxY] = useState(element.y);
  const [boxHeight, setBoxHeight] = useState(element.height || 0);

  const widthRef = useRef(boxWidth);
  const xRef = useRef(boxX);
  const yRef = useRef(boxY);
  const heightRef = useRef(boxHeight);
  widthRef.current = boxWidth;
  xRef.current = boxX;
  yRef.current = boxY;
  heightRef.current = boxHeight;

  const fontSize = element.fontSize || 20;
  const textAlign = element.textAlign || 'left';
  const baseStyle = useMemo(() => getElementBaseStyle(element), [
    element.fontWeight,
    element.fontStyle,
    element.textDecoration,
    element.textColor,
    element.fill,
  ]);
  const baseColorRef = useRef(baseStyle.color);
  baseColorRef.current = baseStyle.color;
  const baseStyleRef = useRef(baseStyle);
  baseStyleRef.current = baseStyle;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const fontSizeRef = useRef(fontSize);
  fontSizeRef.current = fontSize;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // O HTML inicial é criado uma única vez; depois o DOM contentEditable é a fonte da verdade.
  const initialRunsRef = useRef<ReturnType<typeof getElementRuns> | null>(null);
  if (initialRunsRef.current === null) {
    initialRunsRef.current = getElementRuns(element);
  }

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = runsToHtml(initialRunsRef.current || []);
    editor.focus();

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRangeRef.current = range.cloneRange();
    syncHeightRef.current();
  }, []);

  const syncHeight = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = editor.scrollHeight / scaleRef.current;
    setBoxHeight(next);
    heightRef.current = next;
  }, []);
  syncHeightRef.current = syncHeight;

  const placeEditor = useCallback((viewport: ViewportState) => {
    const wrapper = wrapperRef.current;
    const editor = editorRef.current;
    if (!wrapper || !editor) return;
    scaleRef.current = viewport.scale;
    wrapper.style.left = `${xRef.current * viewport.scale + viewport.x}px`;
    wrapper.style.top = `${yRef.current * viewport.scale + viewport.y}px`;
    wrapper.style.width = `${widthRef.current * viewport.scale}px`;
    const displayFs = Math.max(8, fontSizeRef.current * viewport.scale);
    editor.style.fontSize = `${displayFs}px`;
    editor.style.minHeight = `${Math.max(26, displayFs * 1.2)}px`;
  }, []);

  useEffect(() => {
    placeEditor(getViewport());
    return subscribeViewport(placeEditor);
  }, [placeEditor]);

  useLayoutEffect(() => {
    placeEditor(getViewport());
    syncHeight();
  }, [boxX, boxY, boxWidth, fontSize, scale, stagePos, placeEditor, syncHeight]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const editor = editorRef.current;
    if (!editor) return;
    const runs = htmlToRichRuns(editor, baseStyleRef.current);
    const text = runsToPlainText(runs);
    const currentFontSize = fontSizeRef.current;
    const height = Math.max(
      currentFontSize * 1.2,
      editor.scrollHeight / scaleRef.current || heightRef.current
    );
    onFinishRef.current({
      runs,
      text,
      width: widthRef.current,
      x: xRef.current,
      y: yRef.current,
      height,
    });
  }, []);
  finishRef.current = finish;

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    if (!selection) return;
    if (
      selection.rangeCount > 0 &&
      selection.anchorNode &&
      editor.contains(selection.anchorNode)
    ) {
      return;
    }
    if (savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    } else {
      selection.selectAllChildren(editor);
      selection.collapseToEnd();
    }
  }, []);

  const captureSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    if (!editor.contains(selection.anchorNode)) return;
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    textEditingBridge.notify();
  }, []);

  const focusEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
  }, [restoreSelection]);

  const getActiveFormats = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    let color = baseColorRef.current;

    if (editor && selection && selection.anchorNode && editor.contains(selection.anchorNode)) {
      const anchor =
        selection.anchorNode.nodeType === Node.ELEMENT_NODE
          ? (selection.anchorNode as HTMLElement)
          : selection.anchorNode.parentElement;
      if (anchor) {
        const computed = window.getComputedStyle(anchor).color;
        color = normalizeColor(computed) || color;
      }
    }

    return {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      color,
    };
  }, []);

  const getSelectionInfo = useCallback((): TextSelectionInfo | null => {
    const editor = editorRef.current;
    if (!editor) return null;

    const selection = window.getSelection();
    const liveInside = Boolean(
      selection &&
        selection.rangeCount > 0 &&
        selection.anchorNode &&
        editor.contains(selection.anchorNode)
    );
    const savedRange = savedRangeRef.current;
    const savedInside = Boolean(
      savedRange && editor.contains(savedRange.commonAncestorContainer)
    );

    // 1. Seleção viva (letra/palavra/frase) dentro do editor.
    if (liveInside && selection) {
      const selectedText = selection.toString();
      if (selectedText.trim()) return { text: selectedText };
    }

    // 2. Seleção preservada quando o foco foi para a barra/popover.
    if (savedInside && savedRange) {
      const savedText = savedRange.toString();
      if (savedText.trim()) return { text: savedText };
    }

    // 3. Nenhum texto selecionado: usa a palavra sob o cursor.
    const word = liveInside ? getWordAtCaret() : savedInside ? getWordFromRange(savedRange) : null;
    if (word) {
      return { text: (word.node.nodeValue || '').substring(word.start, word.end) };
    }
    return null;
  }, []);

  const applyCommand = useCallback(
    (command: 'bold' | 'italic' | 'underline' | 'strikeThrough') => {
      focusEditor();
      document.execCommand(command, false);
      captureSelection();
      syncHeight();
    },
    [captureSelection, focusEditor, syncHeight]
  );

  const applyColor = useCallback(
    (color?: string) => {
      focusEditor();
      document.execCommand('foreColor', false, normalizeColor(color) || baseColorRef.current);
      captureSelection();
    },
    [captureSelection, focusEditor]
  );

  const selectWordAtCaret = useCallback(() => {
    const word = getWordAtCaret();
    const selection = window.getSelection();
    if (!word || !selection) return false;
    const range = document.createRange();
    range.setStart(word.node, word.start);
    range.setEnd(word.node, word.end);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }, []);

  const selectBackwardBy = useCallback((length: number) => {
    const selection = window.getSelection();
    if (!selection || length <= 0) return;
    for (let i = 0; i < length; i += 1) {
      selection.modify('move', 'backward', 'character');
    }
    for (let i = 0; i < length; i += 1) {
      selection.modify('extend', 'forward', 'character');
    }
  }, []);

  const applyLink = useCallback(
    (url: string, label?: string) => {
      focusEditor();
      const selection = window.getSelection();
      if (!selection) return;

      if (selection.isCollapsed) {
        selectWordAtCaret();
      }

      const selectedText = selection.toString();
      const trimmedLabel = label?.trim() || '';
      const fallbackLabel = url.replace(/^https?:\/\//, '');

      if (selection.isCollapsed) {
        const inserted = trimmedLabel || fallbackLabel;
        document.execCommand('insertText', false, inserted);
        selectBackwardBy(inserted.length);
      } else if (trimmedLabel && trimmedLabel !== selectedText) {
        document.execCommand('insertText', false, trimmedLabel);
        selectBackwardBy(trimmedLabel.length);
      }

      document.execCommand('createLink', false, url);
      captureSelection();
      syncHeight();
      focusEditor();
    },
    [captureSelection, focusEditor, selectBackwardBy, selectWordAtCaret, syncHeight]
  );

  /** Retorna o <a> do cursor/seleção atual (ou da seleção preservada). */
  const getActiveAnchor = useCallback((): HTMLAnchorElement | null => {
    const editor = editorRef.current;
    if (!editor) return null;

    const selection = window.getSelection();
    let node: Node | null = null;
    if (
      selection &&
      selection.rangeCount > 0 &&
      selection.anchorNode &&
      editor.contains(selection.anchorNode)
    ) {
      node = selection.anchorNode;
    } else if (
      savedRangeRef.current &&
      editor.contains(savedRangeRef.current.commonAncestorContainer)
    ) {
      node = savedRangeRef.current.commonAncestorContainer;
    }
    if (!node) return null;

    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    return (element?.closest('a') as HTMLAnchorElement | null) ?? null;
  }, []);

  const removeLink = useCallback(() => {
    focusEditor();
    const selection = window.getSelection();
    const anchor = getActiveAnchor();

    // `unlink` com o cursor apenas pousado dentro do link não faz nada:
    // selecionamos o conteúdo do link antes de remover.
    if (selection && anchor && selection.isCollapsed) {
      const range = document.createRange();
      range.selectNodeContents(anchor);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    document.execCommand('unlink', false);
    captureSelection();
    syncHeight();
    focusEditor();
  }, [captureSelection, focusEditor, getActiveAnchor, syncHeight]);

  const hasActiveLink = useCallback(() => Boolean(getActiveAnchor()), [getActiveAnchor]);

  // Registra o editor ativo na ponte usada pela barra de propriedades.
  useEffect(() => {
    const editor: ActiveTextEditor = {
      elementId: element.id,
      getSelectionInfo,
      getActiveFormats,
      applyCommand,
      applyColor,
      applyLink,
      removeLink,
      hasActiveLink,
      focus: focusEditor,
      finish,
    };
    textEditingBridge.register(editor);
    return () => textEditingBridge.unregister(element.id);
  }, [
    element.id,
    getSelectionInfo,
    getActiveFormats,
    applyCommand,
    applyColor,
    applyLink,
    removeLink,
    hasActiveLink,
    getActiveAnchor,
    focusEditor,
    finish,
  ]);

  // Mantém a seleção salva em dia enquanto o usuário navega pelo texto.
  useEffect(() => {
    document.addEventListener('selectionchange', captureSelection);
    return () => document.removeEventListener('selectionchange', captureSelection);
  }, [captureSelection]);

  // Finaliza ao clicar fora do editor, mas preserva a edição ao interagir com a
  // barra de propriedades e com popovers/menus (que ficam em portais).
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target)) return;
      if (target.closest('[data-mirio-text-toolbar]')) return;
      if (target.closest('[data-radix-popper-content-wrapper]')) return;
      if (target.closest('[data-mirio-inline-editor]')) return;
      if (target.closest('[role="dialog"]')) return;
      finishRef.current();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (event.key === 'Escape' || (mod && event.key === 'Enter')) {
      event.preventDefault();
      event.stopPropagation();
      finish();
      return;
    }

    if (mod && LINK_MODIFIER_KEYS.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      const selection = getSelectionInfo();
      onRequestLink(selection);
      return;
    }

    if (mod && !event.shiftKey && ['b', 'i', 'u'].includes(key)) {
      event.preventDefault();
      applyCommand(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline');
      return;
    }

    if (mod && event.shiftKey && key === 'x') {
      event.preventDefault();
      applyCommand('strikeThrough');
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    if (!text) return;
    document.execCommand('insertText', false, text);
    captureSelection();
    syncHeight();
  };

  const startResize = (side: 'left' | 'right') => (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = widthRef.current;
    const startBoxX = xRef.current;
    const startBoxY = yRef.current;
    const rad = ((element.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const handleMove = (moveEvent: PointerEvent) => {
      const screenDx = moveEvent.clientX - startX;
      const screenDy = moveEvent.clientY - startY;
      const dx = (screenDx * cos + screenDy * sin) / scaleRef.current;
      if (side === 'right') {
        setBoxWidth(Math.max(40, startWidth + dx));
      } else {
        const nextWidth = Math.max(40, startWidth - dx);
        const shift = startWidth - nextWidth;
        setBoxWidth(nextWidth);
        setBoxX(startBoxX + shift * cos);
        setBoxY(startBoxY + shift * sin);
      }
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      syncHeight();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const displayWidth = boxWidth * scale;
  const displayFontSize = Math.max(8, fontSize * scale);

  return (
    <div
      ref={wrapperRef}
      data-mirio-inline-editor="true"
      className="absolute z-50"
      style={{
        left: `${boxX * scale + stagePos.x}px`,
        top: `${boxY * scale + stagePos.y}px`,
        width: `${displayWidth}px`,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        transformOrigin: '0 0',
      }}
    >
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Editar texto"
        className="mirio-rich-editor m-0 w-full select-text border-0 bg-transparent p-0 outline-none"
        style={{
          fontFamily: RICH_TEXT_FONT_FAMILY,
          fontSize: `${displayFontSize}px`,
          lineHeight: 1.2,
          fontWeight: 400,
          fontStyle: 'normal',
          textDecoration: 'none',
          color: baseStyle.color,
          textAlign,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          caretColor: RICH_TEXT_LINK_COLOR,
          minHeight: `${Math.max(26, displayFontSize * 1.2)}px`,
          outline: `1px dashed ${selectionColor}66`,
          outlineOffset: '3px',
          borderRadius: '2px',
        }}
        onInput={() => {
          syncHeight();
          captureSelection();
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={captureSelection}
        onMouseUp={captureSelection}
        onPaste={handlePaste}
      />

      {/* Alças de redimensionamento laterais enquanto edita */}
      <div
        role="separator"
        aria-label="Redimensionar texto pela esquerda"
        onPointerDown={startResize('left')}
        style={{
          position: 'absolute',
          left: '-5px',
          top: '50%',
          width: '9px',
          height: '18px',
          marginTop: '-9px',
          borderRadius: '5px',
          border: `1.5px solid ${selectionColor}`,
          background: '#ffffff',
          cursor: 'ew-resize',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.18)',
          touchAction: 'none',
        }}
      />
      <div
        role="separator"
        aria-label="Redimensionar texto pela direita"
        onPointerDown={startResize('right')}
        style={{
          position: 'absolute',
          right: '-5px',
          top: '50%',
          width: '9px',
          height: '18px',
          marginTop: '-9px',
          borderRadius: '5px',
          border: `1.5px solid ${selectionColor}`,
          background: '#ffffff',
          cursor: 'ew-resize',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.18)',
          touchAction: 'none',
        }}
      />
    </div>
  );
};

RichTextEditor.displayName = 'RichTextEditor';
