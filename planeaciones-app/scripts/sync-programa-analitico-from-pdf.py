#!/usr/bin/env python3
"""Synchronize the digital Programa Analitico with the official PDF.

Narrative pages keep the curated Markdown already used by the application. Pages
whose PDF geometry contains tables are rebuilt from the actual PDF cells so their
content and reading order are no longer flattened into loose lines.
"""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path

import pdfplumber


PAGE_RE = re.compile(
    r"<!-- PAGE_START (?P<number>\d+) -->(?P<body>.*?)<!-- PAGE_END -->",
    re.DOTALL,
)
SYNC_MARKER = "<!-- PDF_CONTENT_SYNC_V7 -->"


def visual_figure(src: str, alt: str, caption: str) -> str:
    return (
        '<figure class="programa-inline-visual">'
        f'<img src="{src}" alt="{html.escape(alt)}" loading="lazy" />'
        f'<figcaption>{html.escape(caption)}</figcaption>'
        '</figure>'
    )


PAGE_VISUALS = {
    9: [("Campos formativos", visual_figure(
        "/programa-analitico/ilustraciones/campos-formativos.svg",
        "Diagrama de los campos formativos, contenidos y procesos de desarrollo de aprendizaje",
        "Figura 1. Campos formativos",
    ))],
    13: [("Aprendizaje basado en proyectos", visual_figure(
        "/programa-analitico/ilustraciones/aprendizaje-proyectos.jpg",
        "Estudiantes colaboran en un proyecto artístico escolar con pintura, materiales reciclados y recursos escénicos",
        "Aprendizaje artístico basado en proyectos",
    ))],
    14: [
        ("Música", visual_figure(
            "/programa-analitico/ilustraciones/musica.jpg",
            "Estudiantes cantan y exploran ritmo, melodía e instrumentos musicales",
            "Exploración del lenguaje artístico de la música",
        )),
        ("Danza", visual_figure(
            "/programa-analitico/ilustraciones/danza.jpg",
            "Estudiantes expresan ideas y emociones mediante movimientos de danza en distintos niveles y direcciones",
            "Exploración del lenguaje artístico de la danza",
        )),
    ],
    15: [
        ("Artes visuales", visual_figure(
            "/programa-analitico/ilustraciones/artes-visuales.jpg",
            "Estudiantes pintan, dibujan, crean collage y modelan una escultura de arcilla",
            "Exploración de los lenguajes de las artes visuales",
        )),
    ],
    16: [("Teatro", visual_figure(
        "/programa-analitico/ilustraciones/teatro.jpg",
        "Estudiantes representan una escena teatral con máscaras, utilería y narración",
        "Exploración del lenguaje artístico del teatro",
    ))],
    17: [("Ejes articuladores", visual_figure(
        "/programa-analitico/ilustraciones/ejes-articuladores.svg",
        "Diagrama con los siete ejes articuladores del Plan de Estudios",
        "Figura 2. Ejes articuladores",
    ))],
}


def normalize(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def real_tables(page):
    result = []
    for table in page.find_tables():
        data = table.extract() or []
        columns = max((len(row) for row in data), default=0)
        _, top, _, bottom = table.bbox
        if columns >= 2 and bottom - top >= 35:
            result.append((table.bbox, data))
    return result


def point_in_bbox(word, bbox) -> bool:
    x0, top, x1, bottom = bbox
    midpoint_x = (word["x0"] + word["x1"]) / 2
    midpoint_y = (word["top"] + word["bottom"]) / 2
    return x0 <= midpoint_x <= x1 and top <= midpoint_y <= bottom


def outside_lines(page, bboxes):
    words = [
        word
        for word in page.extract_words(use_text_flow=True, keep_blank_chars=False)
        if not any(point_in_bbox(word, bbox) for bbox in bboxes)
    ]
    lines = []
    for word in sorted(words, key=lambda item: (round(item["top"] / 3), item["x0"])):
        if not lines or abs(lines[-1]["top"] - word["top"]) > 3:
            lines.append({"top": word["top"], "words": [word]})
        else:
            lines[-1]["words"].append(word)
    result = []
    for line in lines:
        text = normalize(" ".join(item["text"] for item in sorted(line["words"], key=lambda item: item["x0"])))
        if not text:
            continue
        if text.startswith("Programa Analítico de Artes de las Fases"):
            continue
        if re.fullmatch(r"Programa analítico primaria\s+\d+", text, re.IGNORECASE):
            continue
        if re.fullmatch(r"\d+", text) and line["top"] > page.height * 0.88:
            continue
        result.append((line["top"], text))
    return result


def line_markup(text: str) -> str:
    escaped = html.escape(text)
    heading_prefixes = (
        "Contenidos y procesos",
        "Contenidos nacionales",
        "Orientación didáctica",
        "Orientaciones didácticas",
        "Relación de actividades",
        "Múltiples lenguajes",
        "Proyectos escolares",
        "Material de consulta",
        "Referencias",
    )
    if text.startswith(heading_prefixes):
        return f'<h3 class="pdf-section-title">{escaped}</h3>'
    if text in {"Contenido nacional", "Contenido estatal", "PDA 1°", "PDA 2°", "PDA 3°", "PDA 4°", "PDA 5°", "PDA 6°"}:
        return f'<h4 class="pdf-subtitle">{escaped}</h4>'
    return f'<p class="pdf-source-line">{escaped}</p>'


def looks_like_header(row) -> bool:
    joined = " ".join(normalize(cell).lower() for cell in row)
    tokens = (
        "pda", "contenido", "música", "danza", "artes visuales", "teatro",
        "página", "nombre", "actividad", "lenguaje artístico", "campo formativo",
        "ejes articuladores", "producto", "momento", "aspectos",
    )
    return any(token in joined for token in tokens)


def table_markup(data, page_number: int, table_number: int) -> str:
    rows = []
    raw_rows = []
    source_width = max((len(row) for row in data), default=0)
    for row in data:
        values = [normalize(cell) for cell in row] + [""] * (source_width - len(row))
        if any(values):
            raw_rows.append(values)
    if not raw_rows:
        return ""

    density = sum(sum(bool(value) for value in row) for row in raw_rows) / (len(raw_rows) * source_width)
    if density < 0.65:
        # PDF merged cells often appear as several empty geometric columns.
        # Compact only sparse tables; dense data tables retain intentional blanks.
        compacted = [[value for value in row if value] for row in raw_rows]
        width = max(len(row) for row in compacted)
        cleaned = [row + [""] * (width - len(row)) for row in compacted]
    else:
        width = source_width
        cleaned = raw_rows
    if not cleaned:
        return ""
    first_is_header = looks_like_header(cleaned[0])
    for row_index, row in enumerate(cleaned):
        cell_tag = "th" if row_index == 0 and first_is_header else "td"
        populated = [value for value in row if value]
        if len(populated) == 1 and width > 1:
            cells = f'<{cell_tag} colspan="{width}">{html.escape(populated[0])}</{cell_tag}>'
        else:
            cells = "".join(f'<{cell_tag}>{html.escape(value)}</{cell_tag}>' for value in row)
        rows.append(f"<tr>{cells}</tr>")
    return (
        f'<div class="pdf-table-scroll" role="region" aria-label="Tabla {table_number} de la página {page_number}" tabindex="0">'
        f'<table class="pdf-table"><tbody>{"".join(rows)}</tbody></table></div>'
    )


def rebuild_table_page(page, page_number: int) -> str | None:
    tables = real_tables(page)
    if not tables:
        return None
    bboxes = [bbox for bbox, _ in tables]
    blocks = [(top, line_markup(text)) for top, text in outside_lines(page, bboxes)]
    for index, (bbox, data) in enumerate(tables, start=1):
        markup = table_markup(data, page_number, index)
        if markup:
            blocks.append((bbox[1], markup))
    blocks.sort(key=lambda item: item[0])
    rendered_markup = " ".join(markup for _, markup in blocks)
    rendered_text = normalize(html.unescape(re.sub(r"<[^>]+>", " ", rendered_markup))).lower()
    recovered_lines = []
    for source_line in (page.extract_text() or "").splitlines():
        source_line = normalize(source_line)
        if not source_line or source_line.startswith("Programa Analítico de Artes de las Fases"):
            continue
        if re.fullmatch(r"Programa analítico primaria\s+\d+", source_line, re.IGNORECASE):
            continue
        if source_line.lower() not in rendered_text and source_line not in recovered_lines:
            recovered_lines.append(source_line)
    if recovered_lines:
        recovery = '<div class="pdf-recovered-content" aria-label="Contenido recuperado del PDF">' + "".join(
            line_markup(line) for line in recovered_lines
        ) + "</div>"
        blocks.append((page.height + 1, recovery))
    header = (
        f'<small class="block text-xs opacity-50 mb-2">Programa analítico primaria {page_number}</small>\n'
        "Programa Analítico de Artes de las Fases 3, 4 y 5 Versión 2025"
    )
    return header + "\n" + "\n".join(markup for _, markup in blocks)


def rebuild_narrative_page(page, page_number: int) -> str:
    header = (
        f'<small class="block text-xs opacity-50 mb-2">Programa analítico primaria {page_number}</small>\n'
        "Programa Analítico de Artes de las Fases 3, 4 y 5 Versión 2025"
    )
    lines = outside_lines(page, [])
    return header + "\n" + "\n".join(line_markup(text) for _, text in lines)


def insert_page_visuals(body: str, page_number: int) -> str:
    for anchor, figure in PAGE_VISUALS.get(page_number, []):
        escaped_anchor = html.escape(anchor)
        candidates = (
            f'<p class="pdf-source-line">{escaped_anchor}</p>',
            f'<h3 class="pdf-section-title">{escaped_anchor}</h3>',
            f'<h4 class="pdf-subtitle">{escaped_anchor}</h4>',
        )
        inserted = False
        for candidate in candidates:
            if candidate in body:
                body = body.replace(candidate, candidate + "\n" + figure, 1)
                inserted = True
                break
        if not inserted:
            body += "\n" + figure
    return body


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--app", required=True, type=Path)
    args = parser.parse_args()

    public_source = args.app / "public" / "contenidos_programa_analitico.md"
    lib_source = args.app / "src" / "lib" / "data" / "contenidos_programa_analitico.md"
    initial_docs = args.app / "src" / "lib" / "data" / "initialDocs.json"
    source = public_source.read_text(encoding="utf-8")
    existing = {int(match.group("number")): match.group("body").strip() for match in PAGE_RE.finditer(source)}

    output_pages = []
    rebuilt = 0
    with pdfplumber.open(args.pdf) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            body = rebuild_table_page(page, page_number)
            if body is None:
                body = existing.get(page_number, "") if page_number == 1 else rebuild_narrative_page(page, page_number)
            else:
                rebuilt += 1
            body = insert_page_visuals(body, page_number)
            if page_number == 1:
                body = re.sub(r"<!-- PDF_CONTENT_SYNC_V\d+ -->\s*", "", body)
                body = SYNC_MARKER + "\n" + body
                cover = '<img class="programa-cover-art" src="/programa-analitico/portada-artes-digital.png" alt="Ilustración de música, danza, teatro y artes visuales para el Programa Analítico de Artes" />'
                if "programa-cover-art" not in body:
                    body += "\n" + cover
            output_pages.append(f"<!-- PAGE_START {page_number} -->\n{body}\n<!-- PAGE_END -->")

    synchronized = "\n".join(output_pages) + "\n"
    public_source.write_text(synchronized, encoding="utf-8")
    lib_source.write_text(synchronized, encoding="utf-8")

    docs = json.loads(initial_docs.read_text(encoding="utf-8"))
    docs["artes"] = synchronized
    initial_docs.write_text(json.dumps(docs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Synchronized {len(output_pages)} pages; rebuilt {rebuilt} pages containing geometric tables.")


if __name__ == "__main__":
    main()
