'use client';

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

export default function RichTextEditor({ initialContent, onSave, isSaving, editable }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
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
    editorProps: {
      attributes: {
        style: 'outline: none; min-height: 500px; padding-bottom: 200px;',
        class: 'prose prose-invert prose-lg max-w-3xl mx-auto custom-editor'
      },
    },
  });

  if (!editor) return null;

  const btnStyle = (active) => ({
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
    <div style={{ position: 'relative', width: '100%' }}>
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
      `}</style>

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
            <button onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive('bold'))}>B</button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive('italic'))}>I</button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()} style={btnStyle(editor.isActive('underline'))}>U</button>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center', margin: '0 4px' }} />
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} style={btnStyle(editor.isActive('heading', { level: 1 }))}>H1</button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btnStyle(editor.isActive('heading', { level: 2 }))}>H2</button>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center', margin: '0 4px' }} />
            <button 
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
              style={btnStyle(false)}
              title="Insertar Tabla"
            >
              田
            </button>
          </div>
        </BubbleMenu>
      )}

      <div style={{ width: '100%' }}>
        <EditorContent editor={editor} />
      </div>

      {editable && (
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
              {isSaving ? 'Sincronizando...' : 'MODO EDICIÓN'}
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
            {isSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      )}
    </div>
  );
}
