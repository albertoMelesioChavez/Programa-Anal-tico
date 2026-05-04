'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default function MarkdownViewer({ content }) {
    return (
        <article className="doc-prose">
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                    // Custom rendering for the technical headers
                    small: ({node, ...props}) => (
                        <small 
                            {...props} 
                            className="text-[10px] uppercase tracking-widest opacity-40 block border-b border-white/5 pb-2 mb-6 font-mono" 
                        />
                    )
                }}
            >
                {content}
            </ReactMarkdown>
        </article>
    );
}
