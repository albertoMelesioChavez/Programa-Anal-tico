const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'contenidos_programa_analitico.md');
let content = fs.readFileSync(filePath, 'utf8');

// Dividir el contenido por el marcador de página
const pages = content.split(/-- \d+ of 126 --/);

// El primer elemento suele estar vacío o contener basura antes de la primera página
const cleanPages = pages.filter(p => p.trim().length > 0);

// Reconstruir con un delimitador especial que podamos usar en el componente
// Usaremos "<!-- PAGE_BREAK -->" como delimitador
let processedContent = '';

cleanPages.forEach((page, index) => {
    let lines = page.split('\n');
    let formattedLines = [];
    let pageNum = index + 1;

    for (let line of lines) {
        let trimmed = line.trim();
        // Si es el encabezado técnico o el número de página interno
        if (trimmed.includes('Artes primaria_Analítico') || trimmed.includes('Programa analítico primaria')) {
            formattedLines.push(`<small class="block text-xs opacity-50 mb-2">${trimmed}</small>`);
        } else {
            formattedLines.push(line);
        }
    }

    processedContent += `<!-- PAGE_START ${pageNum} -->\n${formattedLines.join('\n')}\n<!-- PAGE_END -->\n`;
});

fs.writeFileSync(filePath, processedContent);
console.log('Markdown processed with card structure markers.');
