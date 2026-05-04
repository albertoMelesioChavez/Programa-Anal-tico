---
name: Premium Tailwind CSS Design
description: Best practices for creating premium, highly aesthetic UIs using Tailwind CSS.
---
# Premium Tailwind CSS Design

## Core Aesthetics
1. **Glassmorphism**: Use translucent backgrounds with blur effects (`bg-white/5 backdrop-blur-md` or `bg-black/20 backdrop-blur-xl`).
2. **Gradients**: Use subtle but vibrant gradients for text and backgrounds.
   - Text: `bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500`
   - Backgrounds: `bg-gradient-to-br from-gray-900 to-black`
3. **Shadows & Glows**: Use colored shadows to create glowing effects.
   - Glow: `shadow-[0_0_30px_rgba(59,130,246,0.5)]`
   - Soft Elevation: `shadow-xl shadow-black/50`

## Micro-Interactions
- **Hover effects**: Always add smooth transitions (`transition-all duration-300`).
- **Transforms**: Use slight translations on hover (`hover:-translate-y-1 hover:scale-[1.02]`).
- **Group effects**: Use `group` and `group-hover` to animate child elements when hovering over a parent container.

## Layout & Space
- Generous padding and margins allow elements to breathe.
- Always implement responsive design using `md:` and `lg:` prefixes.
- Keep content centered and restricted in maximum width for readability (e.g., `max-w-5xl mx-auto`).
