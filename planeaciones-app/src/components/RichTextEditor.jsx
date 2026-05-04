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

const Toolbar = ({ editor }) => {
  if (!editor) return null;

  const btnStyle = (active) => ({
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    background: active ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
    color: active ? 'white' : '#9ca3af',
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
      padding: '8px', 
      background: '#111318', 
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => editor.chain().focus().undo().run()} style={btnStyle(false)} title="Deshacer">↶</button>
        <button onClick={() => editor.chain().focus().redo().run()} style={btnStyle(false)} title="Rehacer">↷</button>
      </div>
      
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive('bold'))} title="Negrita">B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive('italic'))} title="Cursiva">I</button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} style={btnStyle(editor.isActive('underline'))} title="Subrayado">U</button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} style={btnStyle(editor.isActive('strike'))} title="Tachado">S</button>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} style={btnStyle(editor.isActive('heading', { level: 1 }))} title="Título 1">H1</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btnStyle(editor.isActive('heading', { level: 2 }))} title="Título 2">H2</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={btnStyle(editor.isActive('heading', { level: 3 }))} title="Título 3">H3</button>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} style={btnStyle(editor.isActive('bulletList'))} title="Lista de puntos">•</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btnStyle(editor.isActive('orderedList'))} title="Lista numerada">1.</button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} style={btnStyle(editor.isActive('blockquote'))} title="Cita">"</button>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

      <div style={{ display: 'flex', gap: '4px' }}>
        <button 
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
          style={btnStyle(false)}
          title="Insertar Tabla"
        >
          田
        </button>
        <button onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} style={btnStyle(false)} title="Limpiar Formato">∅</button>
      </div>
    </div>
  );
};

export default function RichTextEditor({ initialContent, onSave, isSaving, editable, onFocus }) {
  const [isFocused, setIsFocused] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Highlight,
      Underline,
      BubbleMenuExtension,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Escribe algo extraordinario...' }),
      Table.configure({
        resizable: true,
      }),
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
        // We delay blur slightly to allow clicking toolbar buttons
        setTimeout(() => setIsFocused(false), 200);
    },
    editorProps: {
      attributes: {
        style: 'outline: none; min-height: 200px; padding: 40px;',
        class: 'prose prose-invert prose-lg max-w-3xl mx-auto custom-editor'
      },
    },
  });

  if (!editor) return null;

  const bubbleBtnStyle = (active) => ({
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    background: active ? '#2563eb' : 'transparent',
    color: active ? 'white' : '#9ca3af'
  });

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      background: 'transparent', 
      borderRadius: '16px', 
      border: isFocused ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.05)',
      transition: 'all 0.3s ease',
      background: isFocused ? 'rgba(255,255,255,0.02)' : 'transparent'
    }}>
      <style jsx global>{`
        .custom-editor table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 2rem 0;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        .custom-editor table td,
        .custom-editor table th {
          min-width: 1em;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 16px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
          color: #9ca3af;
        }
        .custom-editor table th {
          font-weight: bold;
          text-align: left;
          background-color: rgba(255, 255, 255, 0.05);
          color: #fff;
        }
        .custom-editor .ProseMirror ul, 
        .custom-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
          color: #9ca3af;
        }
        .custom-editor .ProseMirror li p {
          margin-bottom: 0.25rem;
        }
        .custom-editor .ProseMirror blockquote {
          border-left: 4px solid #2563eb;
          padding-left: 1.5rem;
          font-style: italic;
          color: #d1d5db;
          margin: 2rem 0;
        }
        .custom-editor table .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(37, 99, 235, 0.1);
          pointer-events: none;
        }
        .custom-editor table .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: #2563eb;
          pointer-events: none;
        }
        /* INDICE STYLES */
        .indice-item {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 6px;
          width: 100%;
          color: #d1d5db;
        }
        .indice-title {
          flex-shrink: 0;
          max-width: 85%;
        }
        .indice-dots {
          flex-grow: 1;
          border-bottom: 2px dotted rgba(255, 255, 255, 0.15);
          margin-bottom: 5px;
          min-width: 20px;
        }
        .indice-page {
          flex-shrink: 0;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 800;
          color: #fff;
          min-width: 25px;
          text-align: right;
        }
        .indice-main {
          font-weight: bold;
          font-style: italic;
          color: #fff;
          font-size: 1.1em;
          margin-top: 12px;
        }
        .indice-sub {
          padding-left: 24px;
          font-size: 0.95em;
        }
        .indice-sub-sub {
          padding-left: 48px;
          font-size: 0.9em;
          opacity: 0.8;
        }
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
            <Toolbar editor={editor} />
            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
      )}

      {editor && editable && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            padding: '4px', 
            background: '#1a1d23', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '12px', 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
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
          background: '#1a1d23', 
          border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '20px', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(20px)'
        }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isSaving ? 'Sincronizando...' : 'EDITANDO PÁGINA'}
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
              letterSpacing: '1px',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s',
              opacity: isSaving ? 0.5 : 1
            }}
          >
            {isSaving ? 'GUARDANDO...' : 'GUARDAR PÁGINA'}
          </button>
        </div>
      )}
    </div>
  );
}
