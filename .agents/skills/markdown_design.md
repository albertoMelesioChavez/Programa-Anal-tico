---
name: Premium Markdown Aesthetic Design
description: Techniques to style Markdown content beautifully using Tailwind typography plugin.
---
# Premium Markdown Aesthetic Design

## Tailwind Typography (@tailwindcss/typography)
Use the `prose` class and customize it heavily to move away from the basic default styling.

### 1. Headings
Make headings stand out with gradients, shadows, and clear spacing.
- `prose-h1:text-4xl md:prose-h1:text-6xl prose-h1:font-extrabold prose-h1:bg-clip-text prose-h1:text-transparent prose-h1:bg-gradient-to-r prose-h1:from-cyan-400 prose-h1:to-purple-600`
- `prose-h2:border-b-2 prose-h2:border-blue-500/50 prose-h2:pb-4 prose-h2:mt-16`

### 2. Blockquotes
Transform standard blockquotes into visually distinct callout boxes.
- `prose-blockquote:border-l-8 prose-blockquote:border-purple-500 prose-blockquote:bg-gradient-to-r prose-blockquote:from-purple-900/40 prose-blockquote:to-transparent prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic`

### 3. Tables
Enhance tables with glassmorphism and modern styling.
- `prose-table:overflow-hidden prose-table:rounded-2xl prose-table:shadow-lg prose-table:bg-white/5`
- `prose-thead:bg-gradient-to-r prose-thead:from-blue-900/80 prose-thead:to-purple-900/80`
- `prose-th:p-4 prose-th:text-left prose-th:text-white prose-th:uppercase`

### 4. Code Blocks
Style inline code and pre-formatted blocks elegantly.
- `prose-code:text-pink-400 prose-code:bg-pink-400/10 prose-code:px-2 prose-code:py-1 prose-code:rounded-lg prose-code:before:content-none prose-code:after:content-none`
- `prose-pre:bg-[#0d1117]/80 prose-pre:backdrop-blur-xl prose-pre:border prose-pre:border-white/10 prose-pre:shadow-2xl`
