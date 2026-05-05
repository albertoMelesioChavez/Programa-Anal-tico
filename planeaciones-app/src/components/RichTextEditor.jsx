'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

const Toolbar = ({ editor, darkMode }) => {
  if (!editor) return null;

  const theme = {
    bg: darkMode ? '#111318' : '#f8fafc',
    btnBg: darkMode ? 'rgba(255, 255, 255, 0.05)' : '#fff',
    btnBorder: darkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
    text: darkMode ? '#9ca3af' : '#475569',
    activeBg: '#2563eb',
    activeText: '#ffffff',
    sep: darkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'
  };

  const btnStyle = (active) => ({
    padding: '8px 12px',
    borderRadius: '8px',
    border: active ? 'none' : `1px solid ${theme.btnBorder}`,
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    background: active ? theme.activeBg : theme.btnBg,
    color: active ? theme.activeText : theme.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px'
  });

  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap',
      gap: '4px', 
      padding: '12px', 
      background: theme.bg, 
      borderBottom: `1px solid ${theme.btnBorder}`,
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => editor.chain().focus().undo().run()} style={btnStyle(false)} title="Deshacer">↶</button>
        <button onClick={() => editor.chain().focus().redo().run()} style={btnStyle(false)} title="Rehacer">↷</button>
      </div>
      
      <div style={{ width: '1px', height: '24px', background: theme.sep, margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive('bold'))} title="Negrita">B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive('italic'))} title="Cursiva">I</button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} style={btnStyle(editor.isActive('underline'))} title="Subrayado">U</button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} style={btnStyle(editor.isActive('strike'))} title="Tachado">S</button>
      </div>

      <div style={{ width: '1px', height: '24px', background: theme.sep, margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} style={btnStyle(editor.isActive('heading', { level: 1 }))} title="Título 1">H1</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btnStyle(editor.isActive('heading', { level: 2 }))} title="Título 2">H2</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={btnStyle(editor.isActive('heading', { level: 3 }))} title="Título 3">H3</button>
      </div>

      <div style={{ width: '1px', height: '24px', background: theme.sep, margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} style={btnStyle(editor.isActive('bulletList'))} title="Lista de puntos">•</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btnStyle(editor.isActive('orderedList'))} title="Lista numerada">1.</button>
      </div>

      <div style={{ width: '1px', height: '24px', background: theme.sep, margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: '4px' }}>
        <button 
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
          style={btnStyle(false)}
          title="Insertar Tabla"
        >
          田
        </button>
      </div>
    </div>
  );
};

export default function RichTextEditor({ initialContent, onSave, isSaving, editable, onFocus, darkMode = false }) {
  const [isFocused, setIsFocused] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Highlight,
      Underline,
      BubbleMenuExtension,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Escribe el contenido aquí...' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editable: editable,
    immediatelyRender: false,
    onFocus: () => {
        setIsFocused(true);
        if (onFocus) onFocus();
    },
    onBlur: () => {
        setTimeout(() => setIsFocused(false), 200);
    },
    editorProps: {
      attributes: {
        style: `outline: none; min-height: 200px; padding: 40px; color: ${darkMode ? '#f1f5f9' : '#1e293b'}`,
        class: `prose ${darkMode ? 'prose-invert' : ''} prose-lg max-w-3xl mx-auto custom-editor`
      },
    },
  });

  if (!editor) return null;

  const bubbleTheme = {
    bg: darkMode ? '#1a1d23' : '#ffffff',
    border: darkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    text: darkMode ? '#9ca3af' : '#475569'
  };

  const bubbleBtnStyle = (active) => ({
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    background: active ? '#2563eb' : 'transparent',
    color: active ? 'white' : bubbleTheme.text
  });

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      background: 'transparent', 
      borderRadius: '16px', 
      border: isFocused ? '1px solid rgba(37,99,235,0.3)' : `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`,
      transition: 'all 0.3s ease',
      background: isFocused ? (darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent'
    }}>
      <style jsx global>{`
        .custom-editor table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 2rem 0;
          overflow: hidden;
          border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'};
          border-radius: 8px;
        }
        .custom-editor table td,
        .custom-editor table th {
          min-width: 1em;
          border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'};
          padding: 12px 16px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
          color: ${darkMode ? '#9ca3af' : '#475569'};
        }
        .custom-editor table th {
          font-weight: bold;
          text-align: left;
          background-color: ${darkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc'};
          color: ${darkMode ? '#fff' : '#0f172a'};
        }
        .custom-editor .ProseMirror ul, 
        .custom-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
          color: ${darkMode ? '#9ca3af' : '#475569'};
        }
        .custom-editor .ProseMirror blockquote {
          border-left: 4px solid #2563eb;
          padding-left: 1.5rem;
          font-style: italic;
          color: ${darkMode ? '#d1d5db' : '#64748b'};
          margin: 2rem 0;
        }
        /* INDICE STYLES */
        .indice-item { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; width: 100%; color: ${darkMode ? '#d1d5db' : '#475569'}; }
        .indice-dots { flex-grow: 1; border-bottom: 2px dotted ${darkMode ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1'}; margin-bottom: 5px; min-width: 20px; }
        .indice-page { flex-shrink: 0; font-family: 'JetBrains Mono', monospace; font-weight: 800; color: ${darkMode ? '#fff' : '#0f172a'}; min-width: 25px; text-align: right; }
        .indice-main { font-weight: bold; font-style: italic; color: ${darkMode ? '#fff' : '#0f172a'}; font-size: 1.1em; margin-top: 12px; }
      `}</style>

      {editable && isFocused && (
        <div style={{
            position: 'fixed',
            top: '64px',
            left: '280px',
            right: '60px',
            zIndex: 1000,
            animation: 'slideDown 0.3s ease-out'
        }}>
            <Toolbar editor={editor} darkMode={darkMode} />
        </div>
      )}

      {editor && editable && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            padding: '6px', 
            background: bubbleTheme.bg, 
            border: `1px solid ${bubbleTheme.border}`, 
            borderRadius: '12px', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <button onClick={() => editor.chain().focus().toggleBold().run()} style={bubbleBtnStyle(editor.isActive('bold'))}>B</button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} style={bubbleBtnStyle(editor.isActive('italic'))}>I</button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()} style={bubbleBtnStyle(editor.isActive('underline'))}>U</button>
          </div>
        </BubbleMenu>
      )}

      <div style={{ width: '100%' }}>
        <EditorContent editor={editor} />
      </div>

      {editable && isFocused && (
        <div style={{ 
          position: 'fixed', 
          bottom: '40px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 100, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '8px 8px 8px 16px', 
          background: bubbleTheme.bg, 
          border: `1px solid ${bubbleTheme.border}`, 
          borderRadius: '20px', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(20px)'
        }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: theme.subtext, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isSaving ? 'Sincronizando...' : 'EDITANDO'}
          </span>
          <button
            onClick={() => onSave(editor.getHTML())}
            disabled={isSaving}
            style={{
              background: '#2563eb',
              color: 'white',
              padding: '10px 32px',
              borderRadius: '16px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '900',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
              opacity: isSaving ? 0.5 : 1
            }}
          >
            {isSaving ? 'GUARDANDO...' : 'GUARDAR'}
          </button>
        </div>
      )}
    </div>
  );
}
