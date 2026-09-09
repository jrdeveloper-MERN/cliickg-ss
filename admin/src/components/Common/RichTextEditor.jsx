import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Extension } from '@tiptap/core';
import api from '../../services/api';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent as IndentIcon,
  Outdent as OutdentIcon,
  Quote,
  Minus,
  Table as TableIcon,
  Plus,
  Trash2,
  Columns,
  Rows,
  Merge,
  Split,
  Link2,
  Unlink,
  Image as ImageIcon,
  Video,
  Upload,
  Sparkles,
  ChevronDown,
  CaseSensitive,
  Type,
  RemoveFormatting,
} from 'lucide-react';

// ==================== CUSTOM TIPTAP EXTENSIONS ====================

// 1. Font Size Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).run();
        },
    };
  },
});

// 2. Line Height Extension
const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands }) => {
          return this.options.types.every((type) => commands.updateAttributes(type, { lineHeight }));
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return this.options.types.every((type) => commands.updateAttributes(type, { lineHeight: null }));
        },
    };
  },
});

// 3. Paragraph Spacing Extension
const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          paragraphSpacing: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-spacing') || null,
            renderHTML: (attributes) => {
              if (!attributes.paragraphSpacing) return {};
              const spacingMap = {
                none: 'margin-bottom: 0px;',
                tight: 'margin-bottom: 6px;',
                normal: 'margin-bottom: 14px;',
                relaxed: 'margin-bottom: 22px;',
                loose: 'margin-bottom: 32px;',
              };
              return {
                'data-spacing': attributes.paragraphSpacing,
                style: spacingMap[attributes.paragraphSpacing] || '',
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setParagraphSpacing:
        (spacing) =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { paragraphSpacing: spacing })
          );
        },
    };
  },
});

// 4. Block Indentation Extension
const Indentation = Extension.create({
  name: 'indentation',
  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote'],
      minLevel: 0,
      maxLevel: 8,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const indent = element.getAttribute('data-indent');
              return indent ? parseInt(indent, 10) : 0;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent <= 0) return {};
              return {
                'data-indent': attributes.indent,
                style: `margin-left: ${attributes.indent * 28}px`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const current = node.attrs.indent || 0;
              if (current < this.options.maxLevel) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current + 1 });
              }
            }
          });
          if (dispatch) dispatch(tr);
          return true;
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const current = node.attrs.indent || 0;
              if (current > this.options.minLevel) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current - 1 });
              }
            }
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});

// ==================== CONFIGURATION CONSTANTS ====================

const FONT_FAMILIES = [
  { name: 'Default Font', value: '' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Calibri', value: 'Calibri, sans-serif' },
  { name: 'Cambria', value: 'Cambria, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
];

const FONT_SIZES = [
  '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '60px', '72px'
];

const LINE_HEIGHTS = [
  { label: '1.0 (Single)', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.2', value: '1.2' },
  { label: '1.5 (1.5 lines)', value: '1.5' },
  { label: '2.0 (Double)', value: '2' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3' },
];

const PARAGRAPH_SPACINGS = [
  { label: 'Normal Spacing', value: 'normal' },
  { label: 'No Spacing (0px)', value: 'none' },
  { label: 'Tight Spacing (6px)', value: 'tight' },
  { label: 'Relaxed Spacing (22px)', value: 'relaxed' },
  { label: 'Loose Spacing (32px)', value: 'loose' },
];

const PALETTE_COLORS = [
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  '#E60000', '#FF9900', '#FFFF00', '#008A00', '#0066CC', '#9933FF',
  '#DA251D', '#F47920', '#FFD200', '#00A651', '#009FE3', '#662D91',
  '#8B0000', '#B8860B', '#2E8B57', '#1E3A8A', '#4C1D95', '#831843'
];

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', color: '#FEF08A' },
  { name: 'Bright Green', color: '#BBF7D0' },
  { name: 'Cyan Blue', color: '#BAE6FD' },
  { name: 'Pink', color: '#FBCFE8' },
  { name: 'Peach Orange', color: '#FED7AA' },
  { name: 'Lavender', color: '#E9D5FF' },
  { name: 'None / Remove', color: '' },
];

// ==================== MAIN RICHTEXT EDITOR COMPONENT ====================

const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Type your document content here...',
  disabled = false,
  readOnly = false,
  isLocked: isLockedProp = false,
  minHeight = '200px',
}) => {
  const [currentFontSize, setCurrentFontSize] = useState('16px');
  const [currentFontFamily, setCurrentFontFamily] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableGrid, setTableGrid] = useState({ rows: 3, cols: 3 });
  const [showCaseMenu, setShowCaseMenu] = useState(false);
  const [showLineHeightMenu, setShowLineHeightMenu] = useState(false);
  const [showSpacingMenu, setShowSpacingMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef(null);
  const colorPickerRef = useRef(null);
  const highlightPickerRef = useRef(null);
  const tablePickerRef = useRef(null);
  const caseMenuRef = useRef(null);
  const lineHeightRef = useRef(null);
  const spacingRef = useRef(null);

  const isLocked = disabled || readOnly || isLockedProp;

  // Memoize extensions
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        link: false,
        underline: false,
      }),
      Underline,
      Subscript,
      Superscript,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      ParagraphSpacing,
      Indentation,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Youtube.configure({
        width: 640,
        height: 360,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: value || '',
    editable: !isLocked,
    onUpdate: ({ editor: currentEditor }) => {
      if (onChange && !isLocked) {
        onChange(currentEditor.getHTML(), currentEditor.getJSON());
      }
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!isLocked);
    }
  }, [editor, isLocked]);

  useEffect(() => {
    if (editor && !editor.isFocused && value) {
      if (typeof value === 'object') {
        editor.commands.setContent(value);
      } else if (value !== editor.getHTML()) {
        editor.commands.setContent(value || '');
      }
    }
  }, [value, editor]);

  // Click outside to close dropdown popovers
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(e.target)) {
        setShowHighlightPicker(false);
      }
      if (tablePickerRef.current && !tablePickerRef.current.contains(e.target)) {
        setShowTablePicker(false);
      }
      if (caseMenuRef.current && !caseMenuRef.current.contains(e.target)) {
        setShowCaseMenu(false);
      }
      if (lineHeightRef.current && !lineHeightRef.current.contains(e.target)) {
        setShowLineHeightMenu(false);
      }
      if (spacingRef.current && !spacingRef.current.contains(e.target)) {
        setShowSpacingMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (!editor) {
    return null;
  }

  // ==================== TOOLBAR HANDLERS ====================

  const changeFontSize = (newSize) => {
    setCurrentFontSize(newSize);
    editor.chain().focus().setFontSize(newSize).run();
  };

  const handleIncrementFontSize = () => {
    const idx = FONT_SIZES.indexOf(currentFontSize);
    if (idx < FONT_SIZES.length - 1) {
      const nextSize = FONT_SIZES[idx + 1];
      changeFontSize(nextSize);
    }
  };

  const handleDecrementFontSize = () => {
    const idx = FONT_SIZES.indexOf(currentFontSize);
    if (idx > 0) {
      const prevSize = FONT_SIZES[idx - 1];
      changeFontSize(prevSize);
    }
  };

  const handleFontFamilyChange = (e) => {
    const family = e.target.value;
    setCurrentFontFamily(family);
    if (!family) {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      editor.chain().focus().setFontFamily(family).run();
    }
  };

  const handleStyleChange = (e) => {
    const styleVal = e.target.value;
    if (styleVal === 'p') {
      editor.chain().focus().setParagraph().run();
    } else if (styleVal.startsWith('h')) {
      const level = parseInt(styleVal.replace('h', ''), 10);
      editor.chain().focus().toggleHeading({ level }).run();
    } else if (styleVal === 'blockquote') {
      editor.chain().focus().toggleBlockquote().run();
    } else if (styleVal === 'code') {
      editor.chain().focus().toggleCodeBlock().run();
    }
  };

  const getCurrentStyleValue = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    if (editor.isActive('heading', { level: 4 })) return 'h4';
    if (editor.isActive('heading', { level: 5 })) return 'h5';
    if (editor.isActive('heading', { level: 6 })) return 'h6';
    if (editor.isActive('blockquote')) return 'blockquote';
    if (editor.isActive('codeBlock')) return 'code';
    return 'p';
  };

  // Change Case Transformer
  const handleChangeCase = (mode) => {
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText) return;

    let transformed = selectedText;
    if (mode === 'uppercase') {
      transformed = selectedText.toUpperCase();
    } else if (mode === 'lowercase') {
      transformed = selectedText.toLowerCase();
    } else if (mode === 'titlecase') {
      transformed = selectedText.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    } else if (mode === 'sentencecase') {
      transformed = selectedText.charAt(0).toUpperCase() + selectedText.slice(1).toLowerCase();
    }

    editor.chain().focus().insertContentAt({ from, to }, transformed).run();
    setShowCaseMenu(false);
  };

  // Clear Formatting
  const handleClearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  };

  // Link Handlers
  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter Web, Video, or Email Link URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const cleanUrl = url.trim();
    if (cleanUrl.toLowerCase().startsWith('javascript:') || cleanUrl.toLowerCase().startsWith('data:')) {
      alert('Unsafe link protocol not allowed.');
      return;
    }

    const { from, to } = editor.state.selection;
    if (from === to) {
      // If no text is selected, insert the link text itself as clickable link
      editor.chain().focus().insertContent(`<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a> `).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: cleanUrl }).run();
    }
  };

  const handleUnsetLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  // Image Handlers
  const handleInsertImageUrl = () => {
    const url = window.prompt('Enter Image Direct URL:', '');
    if (url && url.trim() !== '') {
      const clean = url.trim();
      if (clean.toLowerCase().startsWith('javascript:') || clean.toLowerCase().startsWith('data:')) {
        alert('Unsafe image protocol.');
        return;
      }
      editor.chain().focus().setImage({ src: clean }).run();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/cms/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imgUrl = res.data.imageUrl || res.data.url;
      if (imgUrl) {
        editor.chain().focus().setImage({ src: imgUrl }).run();
      }
    } catch (err) {
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // YouTube Handler
  const handleInsertYoutube = () => {
    const url = window.prompt(
      'Enter YouTube Video URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...):',
      ''
    );
    if (url && url.trim() !== '') {
      const clean = url.trim();
      if (clean.toLowerCase().startsWith('javascript:') || clean.toLowerCase().startsWith('data:')) {
        alert('Unsafe video URL.');
        return;
      }
      editor.chain().focus().setYoutubeVideo({ src: clean }).run();
    }
  };

  // Table Handlers
  const handleInsertTable = (rows, cols) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTablePicker(false);
  };

  const isTableActive = editor.isActive('table');

  return (
    <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-slate-50 dark:bg-slate-900/60 transition-all">
      {/* ==================== MICROSOFT WORD-STYLE RIBBON TOOLBAR ==================== */}
      <div
        className={`bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 p-2.5 flex flex-wrap items-center gap-y-2 gap-x-1.5 select-none transition-opacity duration-200 ${
          isLocked ? 'opacity-40 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
      >
        {/* GROUP 1: HISTORY (Undo / Redo) */}
        <div className="flex items-center gap-0.5 bg-slate-100/70 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo size={14} />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* GROUP 2: FONT CONTROLS (Family, Size, Increase, Decrease, Case, Clear) */}
        <div className="flex items-center gap-1">
          {/* Font Family Dropdown */}
          <select
            value={currentFontFamily}
            onChange={handleFontFamilyChange}
            className="h-8 px-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer max-w-[125px]"
            title="Font Family"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.name} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Font Size Dropdown */}
          <select
            value={currentFontSize}
            onChange={(e) => changeFontSize(e.target.value)}
            className="h-8 px-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer w-[62px]"
            title="Font Size"
          >
            {FONT_SIZES.map((sz) => (
              <option key={sz} value={sz}>
                {sz.replace('px', '')}
              </option>
            ))}
          </select>

          {/* Increase / Decrease Font Size */}
          <button
            type="button"
            onClick={handleIncrementFontSize}
            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 rounded-md transition-colors cursor-pointer flex items-center font-bold text-xs"
            title="Increase Font Size"
          >
            A<Plus size={10} className="stroke-[3]" />
          </button>
          <button
            type="button"
            onClick={handleDecrementFontSize}
            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 rounded-md transition-colors cursor-pointer flex items-center font-bold text-xs"
            title="Decrease Font Size"
          >
            A<Minus size={10} className="stroke-[3]" />
          </button>

          {/* Change Case Dropdown */}
          <div className="relative" ref={caseMenuRef}>
            <button
              type="button"
              onClick={() => setShowCaseMenu(!showCaseMenu)}
              className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 rounded-md transition-colors cursor-pointer flex items-center gap-0.5 text-xs font-serif font-bold"
              title="Change Case"
            >
              Aa <ChevronDown size={10} />
            </button>
            {showCaseMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleChangeCase('sentencecase')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 rounded-md transition-colors"
                >
                  Sentence case.
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeCase('lowercase')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 rounded-md transition-colors"
                >
                  lowercase
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeCase('uppercase')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 rounded-md transition-colors"
                >
                  UPPERCASE
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeCase('titlecase')}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 rounded-md transition-colors"
                >
                  Capitalize Each Word
                </button>
              </div>
            )}
          </div>

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={handleClearFormatting}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
            title="Clear All Formatting"
          >
            <RemoveFormatting size={14} />
          </button>
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* GROUP 3: TEXT FORMATTING (Bold, Italic, Underline, Strike, Sub, Super, Text Color, Highlight) */}
        <div className="flex items-center gap-0.5 bg-slate-100/70 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive('bold')
                ? 'bg-sky-500 text-white font-bold shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive('italic')
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive('underline')
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Underline (Ctrl+U)"
            aria-label="Underline"
          >
            <UnderlineIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive('strike')
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Strikethrough"
            aria-label="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive('subscript')
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Subscript"
            aria-label="Subscript"
          >
            <SubscriptIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive('superscript')
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Superscript"
            aria-label="Superscript"
          >
            <SuperscriptIcon size={14} />
          </button>
        </div>

        {/* Text Color Picker Popover */}
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Font Text Color"
          >
            <div className="flex flex-col items-center">
              <span className="font-bold font-serif text-xs leading-none">A</span>
              <div
                className="w-3.5 h-1 rounded-xs mt-0.5"
                style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
              />
            </div>
            <ChevronDown size={10} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1.5 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 w-52">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Theme Colors
              </div>
              <div className="grid grid-cols-6 gap-1.5 mb-3">
                {PALETTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setColor(c).run();
                      setShowColorPicker(false);
                    }}
                    style={{ backgroundColor: c }}
                    className="w-6 h-6 rounded-md border border-slate-300 dark:border-slate-600 hover:scale-115 transition-transform cursor-pointer"
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <input
                  type="color"
                  onChange={(e) => {
                    editor.chain().focus().setColor(e.target.value).run();
                  }}
                  className="w-6 h-6 rounded-md cursor-pointer border-0 p-0 bg-transparent"
                  title="Custom Hex Color"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Custom Color...</span>
              </div>
            </div>
          )}
        </div>

        {/* Highlight Color Picker Popover */}
        <div className="relative" ref={highlightPickerRef}>
          <button
            type="button"
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            className={`h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer ${
              editor.isActive('highlight')
                ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
            title="Text Highlight Color"
          >
            <Highlighter size={13} />
            <ChevronDown size={10} />
          </button>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1.5 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 w-48 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Highlight Colors
              </div>
              {HIGHLIGHT_COLORS.map((h) => (
                <button
                  key={h.name}
                  type="button"
                  onClick={() => {
                    if (!h.color) {
                      editor.chain().focus().unsetHighlight().run();
                    } else {
                      editor.chain().focus().setHighlight({ color: h.color }).run();
                    }
                    setShowHighlightPicker(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <span
                    className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600 shrink-0"
                    style={{ backgroundColor: h.color || 'transparent' }}
                  />
                  <span>{h.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* GROUP 4: PARAGRAPH, LISTS & ALIGNMENT */}
        <div className="flex items-center gap-0.5 bg-slate-100/70 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          {/* Bullet & Numbered Lists */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive('bulletList')
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Bullets (Ctrl+Shift+8)"
            aria-label="Bullet List"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive('orderedList')
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Numbering (Ctrl+Shift+7)"
            aria-label="Numbered List"
          >
            <ListOrdered size={14} />
          </button>

          {/* Indent / Outdent */}
          <button
            type="button"
            onClick={() => editor.chain().focus().outdent().run()}
            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600 rounded-md transition-colors cursor-pointer"
            title="Decrease Indent"
            aria-label="Decrease Indent"
          >
            <OutdentIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().indent().run()}
            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600 rounded-md transition-colors cursor-pointer"
            title="Increase Indent"
            aria-label="Increase Indent"
          >
            <IndentIcon size={14} />
          </button>
        </div>

        {/* Alignment Group */}
        <div className="flex items-center gap-0.5 bg-slate-100/70 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive({ textAlign: 'left' })
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Align Left (Ctrl+L)"
            aria-label="Align Left"
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive({ textAlign: 'center' })
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Align Center (Ctrl+E)"
            aria-label="Align Center"
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive({ textAlign: 'right' })
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Align Right (Ctrl+R)"
            aria-label="Align Right"
          >
            <AlignRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              editor.isActive({ textAlign: 'justify' })
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Justify (Ctrl+J)"
            aria-label="Justify"
          >
            <AlignJustify size={14} />
          </button>
        </div>

        {/* Line Spacing Popover */}
        <div className="relative" ref={lineHeightRef}>
          <button
            type="button"
            onClick={() => setShowLineHeightMenu(!showLineHeightMenu)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer"
            title="Line Spacing"
          >
            <span>↕</span>
            <ChevronDown size={10} />
          </button>
          {showLineHeightMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1">
                Line Spacing
              </div>
              {LINE_HEIGHTS.map((lh) => (
                <button
                  key={lh.value}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setLineHeight(lh.value).run();
                    setShowLineHeightMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 rounded-md transition-colors"
                >
                  {lh.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Paragraph Spacing Popover */}
        <div className="relative" ref={spacingRef}>
          <button
            type="button"
            onClick={() => setShowSpacingMenu(!showSpacingMenu)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer"
            title="Paragraph Spacing"
          >
            <span>¶</span>
            <ChevronDown size={10} />
          </button>
          {showSpacingMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1">
                Paragraph Spacing
              </div>
              {PARAGRAPH_SPACINGS.map((sp) => (
                <button
                  key={sp.value}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setParagraphSpacing(sp.value).run();
                    setShowSpacingMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 rounded-md transition-colors"
                >
                  {sp.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* GROUP 5: STYLES DROPDOWN (Word-like Styles) */}
        <div className="flex items-center">
          <select
            value={getCurrentStyleValue()}
            onChange={handleStyleChange}
            className="h-8 px-2.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer w-[130px]"
            title="Styles (Headings / Body)"
          >
            <option value="p">Normal (Body)</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="h5">Heading 5</option>
            <option value="h6">Heading 6</option>
            <option value="blockquote">Quote Block</option>
            <option value="code">Code Snippet</option>
          </select>
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* GROUP 6: INSERT (Table, Link, Image, Horizontal Rule, YouTube) */}
        <div className="flex items-center gap-1">
          {/* Table Grid Insert Popover */}
          <div className="relative" ref={tablePickerRef}>
            <button
              type="button"
              onClick={() => setShowTablePicker(!showTablePicker)}
              className={`h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer ${
                isTableActive
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
              title="Insert Table"
            >
              <TableIcon size={14} />
              <span>Table</span>
              <ChevronDown size={10} />
            </button>
            {showTablePicker && (
              <div className="absolute top-full left-0 mt-1.5 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 w-56">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Insert Table</span>
                  <span className="font-mono text-sky-600 dark:text-sky-400">
                    {tableGrid.cols} × {tableGrid.rows}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1 mb-3">
                  {[1, 2, 3, 4, 5, 6].map((r) =>
                    [1, 2, 3, 4, 5, 6].map((c) => {
                      const isHighlighted = r <= tableGrid.rows && c <= tableGrid.cols;
                      return (
                        <div
                          key={`${r}-${c}`}
                          onMouseEnter={() => setTableGrid({ rows: r, cols: c })}
                          onClick={() => handleInsertTable(tableGrid.rows, tableGrid.cols)}
                          className={`w-6 h-6 rounded-xs border cursor-pointer transition-colors ${
                            isHighlighted
                              ? 'bg-sky-500 border-sky-600'
                              : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                          }`}
                        />
                      );
                    })
                  )}
                </div>
                <div className="text-[10px] text-slate-500 text-center">Click cell to insert table</div>
              </div>
            )}
          </div>

          {/* Link Button */}
          <button
            type="button"
            onClick={handleSetLink}
            className={`p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer ${
              editor.isActive('link')
                ? 'bg-sky-500 text-white border-sky-500'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600'
            }`}
            title="Insert Link (Ctrl+K)"
          >
            <Link2 size={14} />
          </button>
          {editor.isActive('link') && (
            <button
              type="button"
              onClick={handleUnsetLink}
              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Remove Link"
            >
              <Unlink size={14} />
            </button>
          )}

          {/* Image Upload / URL */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
            title="Upload Local Image"
          >
            <Upload size={14} />
          </button>
          <button
            type="button"
            onClick={handleInsertImageUrl}
            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Insert Image by URL"
          >
            <ImageIcon size={14} />
          </button>

          {/* YouTube Video Embed */}
          <button
            type="button"
            onClick={handleInsertYoutube}
            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
            title="Embed YouTube Video"
          >
            <Video size={14} />
          </button>

          {/* Horizontal Rule */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Horizontal Divider"
          >
            <Minus size={14} />
          </button>
        </div>

        {/* Hidden File Input for Image Uploads */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
        />
      </div>

      {/* ==================== CONTEXTUAL TABLE TOOLBAR ==================== */}
      {isTableActive && !isLocked && (
        <div className="bg-sky-50 dark:bg-sky-950/40 border-b border-sky-200 dark:border-sky-800 px-3 py-1.5 flex flex-wrap items-center gap-1 text-xs select-none animate-in fade-in duration-150">
          <span className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1 text-[11px] uppercase tracking-wider mr-1">
            <TableIcon size={12} /> Table Tools:
          </span>

          <button
            type="button"
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-600 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Add Row Above"
          >
            + Row Above
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-600 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Add Row Below"
          >
            + Row Below
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="px-2 py-1 bg-white dark:bg-slate-800 text-rose-600 hover:bg-rose-50 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Delete Current Row"
          >
            Delete Row
          </button>

          <div className="w-[1px] h-4 bg-sky-300 dark:bg-sky-700 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-600 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Add Column Left"
          >
            + Col Left
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-600 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Add Column Right"
          >
            + Col Right
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-2 py-1 bg-white dark:bg-slate-800 text-rose-600 hover:bg-rose-50 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Delete Current Column"
          >
            Delete Col
          </button>

          <div className="w-[1px] h-4 bg-sky-300 dark:bg-sky-700 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().mergeCells().run()}
            className="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-600 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Merge Selected Cells"
          >
            Merge Cells
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().splitCell().run()}
            className="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-600 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Split Cell"
          >
            Split Cell
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            className="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-600 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Toggle Header Row"
          >
            Header Row
          </button>

          <div className="w-[1px] h-4 bg-sky-300 dark:bg-sky-700 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="px-2 py-1 bg-rose-600 text-white hover:bg-rose-700 rounded-md text-[11px] font-bold transition-colors cursor-pointer"
            title="Delete Entire Table"
          >
            Delete Table
          </button>
        </div>
      )}

      {/* ==================== CLEAN RESPONSIVE DOCUMENT CANVAS ==================== */}
      <div className="p-3 sm:p-5 bg-slate-100/90 dark:bg-slate-950 flex justify-center overflow-x-auto">
        <div 
          className="w-full max-w-[850px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs p-4 sm:p-6 transition-shadow focus-within:shadow-md"
          style={{ minHeight }}
        >
          <style>{`
            .ProseMirror {
              outline: none;
              min-height: ${minHeight};
              color: #1e293b;
              font-family: Calibri, Inter, Arial, sans-serif;
              font-size: 15px;
              line-height: 1.6;
            }
            .dark .ProseMirror {
              color: #e2e8f0;
            }
            .ProseMirror p {
              margin-top: 0;
              margin-bottom: 12px;
            }
            .ProseMirror h1 {
              font-size: 28px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 24px;
              margin-bottom: 12px;
              line-height: 1.25;
            }
            .dark .ProseMirror h1 { color: #f8fafc; }
            .ProseMirror h2 {
              font-size: 22px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 20px;
              margin-bottom: 10px;
              line-height: 1.3;
            }
            .dark .ProseMirror h2 { color: #f8fafc; }
            .ProseMirror h3 {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin-top: 16px;
              margin-bottom: 8px;
              line-height: 1.35;
            }
            .dark .ProseMirror h3 { color: #f1f5f9; }
            .ProseMirror h4 {
              font-size: 16px;
              font-weight: 600;
              color: #1e293b;
              margin-top: 14px;
              margin-bottom: 6px;
            }
            .ProseMirror h5 {
              font-size: 14px;
              font-weight: 600;
              color: #334155;
              margin-top: 12px;
              margin-bottom: 4px;
            }
            .ProseMirror h6 {
              font-size: 13px;
              font-weight: 600;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-top: 10px;
              margin-bottom: 4px;
            }
            .ProseMirror ul {
              list-style-type: disc;
              padding-left: 24px;
              margin-bottom: 12px;
            }
            .ProseMirror ol {
              list-style-type: decimal;
              padding-left: 24px;
              margin-bottom: 12px;
            }
            .ProseMirror li {
              margin-bottom: 4px;
            }
            .ProseMirror blockquote {
              border-left: 4px solid #0284c7;
              padding: 8px 16px;
              margin: 16px 0;
              background-color: #f0f9ff;
              border-radius: 0 8px 8px 0;
              font-style: italic;
              color: #0369a1;
            }
            .dark .ProseMirror blockquote {
              background-color: rgba(3, 105, 161, 0.15);
              color: #38bdf8;
            }
            .ProseMirror pre {
              background: #0f172a;
              color: #f8fafc;
              padding: 12px 16px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 13px;
              overflow-x: auto;
              margin: 14px 0;
            }
            .ProseMirror code {
              background-color: rgba(148, 163, 184, 0.2);
              padding: 2px 5px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 0.9em;
            }
            .ProseMirror hr {
              border: 0;
              border-top: 1.5px solid #e2e8f0;
              margin: 24px 0;
            }
            .dark .ProseMirror hr {
              border-color: #334155;
            }
            .ProseMirror a {
              color: #0284c7;
              text-decoration: underline;
              font-weight: 500;
            }
            .ProseMirror a:hover {
              color: #0369a1;
            }
            .ProseMirror img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              margin: 12px 0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .ProseMirror table {
              border-collapse: collapse;
              table-layout: fixed;
              width: 100%;
              margin: 16px 0;
              overflow: hidden;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
            }
            .dark .ProseMirror table {
              border-color: #475569;
            }
            .ProseMirror td,
            .ProseMirror th {
              min-width: 1em;
              border: 1px solid #cbd5e1;
              padding: 8px 12px;
              vertical-align: top;
              box-sizing: border-box;
              position: relative;
            }
            .dark .ProseMirror td,
            .dark .ProseMirror th {
              border-color: #475569;
            }
            .ProseMirror th {
              font-weight: 700;
              text-align: left;
              background-color: #f1f5f9;
              color: #0f172a;
            }
            .dark .ProseMirror th {
              background-color: #1e293b;
              color: #f8fafc;
            }
            .ProseMirror .selectedCell:after {
              z-index: 2;
              position: absolute;
              content: "";
              left: 0; right: 0; top: 0; bottom: 0;
              background: rgba(14, 165, 233, 0.15);
              pointer-events: none;
            }
            .ProseMirror .column-resize-handle {
              position: absolute;
              right: -2px;
              top: 0;
              bottom: -2px;
              width: 4px;
              background-color: #38bdf8;
              pointer-events: none;
            }
            .ProseMirror p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              float: left;
              color: #94a3b8;
              pointer-events: none;
              height: 0;
            }
          `}</style>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
