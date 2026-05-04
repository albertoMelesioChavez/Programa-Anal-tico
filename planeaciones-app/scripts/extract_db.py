"""
extract_db.py - Extract structured educational data from the Artes Primaria PDF
into the existing better-sqlite3 database.

Reads: Artes primaria_Analítico 2025_310825.pdf
Writes: database/app.db (SQLite)
Exports: public/programa_analitico_data.json

Usage: python3 scripts/extract_db.py
"""

import pdfplumber
import sqlite3
import json
import re
import os

# ─── Configuration ───────────────────────────────────────────────────────────

PDF_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'Artes primaria_Analítico 2025_310825 .pdf')
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database', 'app.db')
JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'programa_analitico_data.json')

# Page ranges for each fase's content/PDA tables
FASE_PAGES = {
    3: {'start': 24, 'end': 37, 'grados': [1, 2], 'lenguajes_order': ['Música', 'Danza', 'Artes Visuales', 'Teatro']},
    4: {'start': 40, 'end': 62, 'grados': [3, 4], 'lenguajes_order': ['Música', 'Danza', 'Artes Visuales', 'Teatro']},
    5: {'start': 65, 'end': 82, 'grados': [5, 6], 'lenguajes_order': ['Música', 'Danza', 'Artes Visuales', 'Teatro']},
}

# Orientaciones didácticas section (separate extraction)
ORIENTACIONES_PAGES = {'start': 83, 'end': 110}

# ─── Helper Functions ────────────────────────────────────────────────────────

def fix_doubled_chars(text):
    """Fix PDF rendering artifact where every character is doubled (e.g. CCoonntteenniiddoo → Contenido)."""
    if not text or len(text) < 4:
        return text
    # Check if the text appears to be doubled: every pair of chars is the same
    is_doubled = True
    for i in range(0, min(len(text), 20) - 1, 2):
        if text[i] != text[i + 1]:
            is_doubled = False
            break
    if is_doubled and len(text) > 6:
        return text[::2]  # Take every other character
    return text


def clean_text(text):
    """Normalize whitespace from PDF extraction while preserving original content."""
    if not text:
        return ''
    # Fix doubled-character rendering artifacts
    text = fix_doubled_chars(text)
    # Only collapse multi-whitespace caused by PDF column layout into single spaces
    text = re.sub(r'\n', ' ', text)
    text = re.sub(r'\t+', ' ', text)
    text = re.sub(r'  +', ' ', text)
    return text.strip()


def detect_lenguaje(text):
    """Detect which artistic language a content belongs to based on keywords."""
    text_lower = text.lower()
    if 'música' in text_lower or 'musical' in text_lower or 'canto' in text_lower or 'sonor' in text_lower:
        return 'Música'
    elif 'danza' in text_lower or 'dancístic' in text_lower or 'coreog' in text_lower or 'corporal' in text_lower:
        return 'Danza'
    elif 'artes visuales' in text_lower or 'visual' in text_lower or 'dibujo' in text_lower or 'pintura' in text_lower:
        return 'Artes Visuales'
    elif 'teatro' in text_lower or 'teatral' in text_lower or 'escénic' in text_lower or 'dramátic' in text_lower:
        return 'Teatro'
    return None


def extract_tables_from_page(pdf, page_num):
    """Extract all meaningful tables from a page (skip page number tables)."""
    if page_num > len(pdf.pages):
        return []
    page = pdf.pages[page_num - 1]
    tables = page.extract_tables()
    # Filter out page number tables (3 rows x 3 cols with just a number)
    return [t for t in tables if len(t) > 3 or (len(t[0]) if t else 0) > 3]


def parse_content_table(table):
    """
    Parse a single content/PDA table from the PDF.
    
    Expected structure:
    Row 0: ['', 'Contenido nacional', ...]
    Row 1: ['', '<description>', ...]          <- contenido nacional
    Row 2: ['', 'Contenido estatal de X', ...] 
    Row 3-N: ['', '• <description>', ...]      <- contenido estatal bullets
    Row N+1: ['', 'PDA X°', '', '', 'PDA Y°', '']
    Row N+2: ['<pda_text_1>', ..., '<pda_text_2>', ...]
    
    Returns dict with extracted data or None if table doesn't match pattern.
    """
    if not table or len(table) < 4:
        return None
    
    result = {
        'contenido_nacional': '',
        'contenido_estatal_header': '',
        'contenido_estatal_bullets': [],
        'pda_inferior': '',
        'pda_superior': '',
        'pda_grado_inferior': None,
        'pda_grado_superior': None,
    }
    
    # Scan rows to identify structure
    found_nacional = False
    found_estatal = False
    found_pda_header = False
    
    for ri, row in enumerate(table):
        # Flatten row to single string for analysis
        row_text = ' '.join([clean_text(cell) for cell in row if cell])
        
        if not row_text.strip():
            continue
        
        # Detect "Contenido nacional" header
        if 'Contenido nacional' in row_text and not found_nacional:
            found_nacional = True
            # The actual content may be in this row or the next
            # Check if there's text beyond "Contenido nacional"
            content_part = row_text.replace('Contenido nacional', '').strip()
            if content_part:
                result['contenido_nacional'] = content_part
            continue
        
        # If we just found the nacional header, next non-empty content row is the description
        if found_nacional and not result['contenido_nacional'] and not 'Contenido estatal' in row_text:
            result['contenido_nacional'] = clean_text(row_text)
            continue
        
        # Detect "Contenido estatal de X"
        if 'Contenido estatal' in row_text:
            found_estatal = True
            result['contenido_estatal_header'] = clean_text(row_text)
            continue
        
        # Detect PDA header row
        pda_match = re.search(r'PDA\s+(\d+)[°º]', row_text)
        if pda_match and not found_pda_header:
            found_pda_header = True
            # Extract both grade numbers from the row
            pda_grades = re.findall(r'PDA\s+(\d+)[°º]', row_text)
            if len(pda_grades) >= 2:
                result['pda_grado_inferior'] = int(pda_grades[0])
                result['pda_grado_superior'] = int(pda_grades[1])
            elif len(pda_grades) == 1:
                result['pda_grado_inferior'] = int(pda_grades[0])
            continue
        
        # If we've found estatal but not PDA header, these are bullet points
        if found_estatal and not found_pda_header:
            bullet_text = clean_text(row_text)
            if bullet_text and bullet_text not in ('', 'Contenido'):
                result['contenido_estatal_bullets'].append(bullet_text)
            continue
        
        # If we've found PDA header, next row has the PDA descriptions
        if found_pda_header:
            # PDA texts are split across columns
            # For 6-col tables: cols 0-2 = PDA inferior, cols 3-5 = PDA superior
            if len(row) >= 6:
                left_cells = [clean_text(c) for c in row[:3] if c]
                right_cells = [clean_text(c) for c in row[3:] if c]
                result['pda_inferior'] = ' '.join(left_cells).strip()
                result['pda_superior'] = ' '.join(right_cells).strip()
            elif len(row) >= 3:
                left_cells = [clean_text(c) for c in row[:1] if c]
                right_cells = [clean_text(c) for c in row[2:] if c]
                result['pda_inferior'] = ' '.join(left_cells).strip()
                result['pda_superior'] = ' '.join(right_cells).strip()
            elif len(row) == 2:
                # 2-column tables (common in Fase 4 Danza/AV/Teatro)
                result['pda_inferior'] = clean_text(row[0]) if row[0] else ''
                result['pda_superior'] = clean_text(row[1]) if row[1] else ''
            found_pda_header = False  # Reset for next potential PDA in same table
            continue
    
    # Validate: we need at least contenido nacional to consider this valid
    if not result['contenido_nacional']:
        return None
    
    return result


# ─── Main Extraction ─────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("EXTRACCIÓN DE BASE DE DATOS DESDE PDF")
    print("=" * 60)
    
    # ─── Connect to DB ────────────────────────────────────────────────────
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()
    
    # Clear existing extracted data (keep catalog data)
    print("\n[1/5] Limpiando datos anteriores...")
    cur.execute("DELETE FROM pdas")
    cur.execute("DELETE FROM contenidos_estatales")
    cur.execute("DELETE FROM contenidos_nacionales")
    cur.execute("DELETE FROM orientaciones_didacticas")
    conn.commit()
    
    # Verify catalog data exists
    cur.execute("SELECT id, nombre FROM fases ORDER BY id")
    fases = {row[1]: row[0] for row in cur.fetchall()}
    print(f"  Fases encontradas: {fases}")
    
    cur.execute("SELECT id, nombre FROM grados ORDER BY id")
    grados_db = {row[1]: row[0] for row in cur.fetchall()}
    print(f"  Grados encontrados: {grados_db}")
    
    cur.execute("SELECT id, nombre FROM lenguajes_artisticos ORDER BY id")
    lenguajes_db = {row[1]: row[0] for row in cur.fetchall()}
    print(f"  Lenguajes encontrados: {lenguajes_db}")
    
    # Map grade number to grado name/id
    grado_num_to_name = {1: '1º Grado', 2: '2º Grado', 3: '3º Grado', 4: '4º Grado', 5: '5º Grado', 6: '6º Grado'}
    
    # ─── Extract from PDF ─────────────────────────────────────────────────
    print("\n[2/5] Abriendo PDF...")
    pdf = pdfplumber.open(PDF_PATH)
    print(f"  Páginas totales: {len(pdf.pages)}")
    
    stats = {'contenidos_nacionales': 0, 'contenidos_estatales': 0, 'pdas': 0}
    
    for fase_num, config in FASE_PAGES.items():
        fase_nombre = f'Fase {fase_num}'
        fase_id = fases.get(fase_nombre)
        if not fase_id:
            print(f"  ⚠️  Fase '{fase_nombre}' no encontrada en BD. Saltando.")
            continue
        
        print(f"\n[3/5] Procesando {fase_nombre} (páginas {config['start']}-{config['end']})...")
        
        current_lenguaje = None
        
        for page_num in range(config['start'], config['end'] + 1):
            if page_num > len(pdf.pages):
                break
            
            page = pdf.pages[page_num - 1]
            page_text = page.extract_text() or ''
            
            # Detect current lenguaje from page text
            if 'Contenido estatal de música' in page_text.lower() or 'contenido estatal de música' in page_text:
                current_lenguaje = 'Música'
            elif 'Contenido estatal de danza' in page_text.lower() or 'contenido estatal de danza' in page_text:
                current_lenguaje = 'Danza'
            elif 'Contenido estatal de artes visuales' in page_text.lower() or 'contenido estatal de artes visuales' in page_text:
                current_lenguaje = 'Artes Visuales'
            elif 'Contenido estatal de teatro' in page_text.lower() or 'contenido estatal de teatro' in page_text:
                current_lenguaje = 'Teatro'
            
            tables = page.extract_tables()
            
            for table in tables:
                # Skip small/page-number tables
                if not table or len(table) < 4:
                    continue
                if len(table[0]) <= 3 and len(table) <= 3:
                    continue
                
                parsed = parse_content_table(table)
                if not parsed:
                    continue
                
                # Determine lenguaje from header or detection
                lenguaje = current_lenguaje
                if parsed['contenido_estatal_header']:
                    header_lower = parsed['contenido_estatal_header'].lower()
                    if 'música' in header_lower:
                        lenguaje = 'Música'
                    elif 'danza' in header_lower:
                        lenguaje = 'Danza'
                    elif 'artes visuales' in header_lower:
                        lenguaje = 'Artes Visuales'
                    elif 'teatro' in header_lower:
                        lenguaje = 'Teatro'
                
                if not lenguaje:
                    lenguaje = detect_lenguaje(parsed['contenido_nacional'])
                
                if not lenguaje:
                    print(f"    ⚠️  No se pudo determinar lenguaje en pág {page_num}: {parsed['contenido_nacional'][:60]}")
                    continue
                
                lenguaje_id = lenguajes_db.get(lenguaje)
                if not lenguaje_id:
                    print(f"    ⚠️  Lenguaje '{lenguaje}' no encontrado en BD")
                    continue
                
                # Insert contenido nacional
                cur.execute(
                    "INSERT INTO contenidos_nacionales (fase_id, descripcion) VALUES (?, ?)",
                    (fase_id, parsed['contenido_nacional'])
                )
                cn_id = cur.lastrowid
                stats['contenidos_nacionales'] += 1
                
                # Insert contenido estatal (combine bullets into one record per bullet)
                ce_ids = []
                if parsed['contenido_estatal_bullets']:
                    for bullet in parsed['contenido_estatal_bullets']:
                        cur.execute(
                            "INSERT INTO contenidos_estatales (contenido_nacional_id, fase_id, lenguaje_id, descripcion) VALUES (?, ?, ?, ?)",
                            (cn_id, fase_id, lenguaje_id, bullet)
                        )
                        ce_ids.append(cur.lastrowid)
                        stats['contenidos_estatales'] += 1
                else:
                    # No bullets, create a placeholder linking to the nacional
                    cur.execute(
                        "INSERT INTO contenidos_estatales (contenido_nacional_id, fase_id, lenguaje_id, descripcion) VALUES (?, ?, ?, ?)",
                        (cn_id, fase_id, lenguaje_id, parsed['contenido_nacional'])
                    )
                    ce_ids.append(cur.lastrowid)
                    stats['contenidos_estatales'] += 1
                
                # The PDAs link to the first contenido estatal for simplicity
                ce_id = ce_ids[0] if ce_ids else None
                
                # Insert PDAs
                if parsed['pda_inferior'] and parsed['pda_grado_inferior'] and ce_id:
                    grado_name = grado_num_to_name.get(parsed['pda_grado_inferior'])
                    grado_id = grados_db.get(grado_name)
                    if grado_id:
                        cur.execute(
                            "INSERT INTO pdas (contenido_estatal_id, grado_id, lenguaje_id, grado_numero, descripcion) VALUES (?, ?, ?, ?, ?)",
                            (ce_id, grado_id, lenguaje_id, parsed['pda_grado_inferior'], parsed['pda_inferior'])
                        )
                        stats['pdas'] += 1
                
                if parsed['pda_superior'] and parsed['pda_grado_superior'] and ce_id:
                    grado_name = grado_num_to_name.get(parsed['pda_grado_superior'])
                    grado_id = grados_db.get(grado_name)
                    if grado_id:
                        cur.execute(
                            "INSERT INTO pdas (contenido_estatal_id, grado_id, lenguaje_id, grado_numero, descripcion) VALUES (?, ?, ?, ?, ?)",
                            (ce_id, grado_id, lenguaje_id, parsed['pda_grado_superior'], parsed['pda_superior'])
                        )
                        stats['pdas'] += 1
                
                print(f"    ✅ Pág {page_num} | {lenguaje} | CN: {parsed['contenido_nacional'][:50]}...")
    
    # ─── Extract Orientaciones Didácticas ─────────────────────────────────
    print(f"\n[3.5/5] Extrayendo orientaciones didácticas (páginas {ORIENTACIONES_PAGES['start']}-{ORIENTACIONES_PAGES['end']})...")
    
    current_fase = None
    current_lenguaje_od = None
    stats['orientaciones'] = 0
    
    for page_num in range(ORIENTACIONES_PAGES['start'], ORIENTACIONES_PAGES['end'] + 1):
        if page_num > len(pdf.pages):
            break
        
        page = pdf.pages[page_num - 1]
        page_text = page.extract_text() or ''
        
        # Detect fase from page text
        if 'tercera fase' in page_text.lower():
            current_fase = fases.get('Fase 3')
        elif 'cuarta fase' in page_text.lower():
            current_fase = fases.get('Fase 4')
        elif 'quinta fase' in page_text.lower():
            current_fase = fases.get('Fase 5')
        
        # Detect lenguaje from page text
        page_lower = page_text.lower()
        if 'orientación didáctica de música' in page_lower or 'orientación didáctica de de música' in page_lower:
            current_lenguaje_od = lenguajes_db.get('Música')
        elif 'orientación didáctica de danza' in page_lower or 'orientación didáctica de de danza' in page_lower:
            current_lenguaje_od = lenguajes_db.get('Danza')
        elif 'orientación didáctica de artes visuales' in page_lower or 'orientación didáctica de de artes visuales' in page_lower:
            current_lenguaje_od = lenguajes_db.get('Artes Visuales')
        elif 'orientación didáctica de teatro' in page_lower or 'orientación didáctica de de teatro' in page_lower:
            current_lenguaje_od = lenguajes_db.get('Teatro')
        
        if current_fase and current_lenguaje_od and page_text.strip():
            # Store the full page text as an orientación
            # Only store if not a near-duplicate of the previous entry
            cleaned_text = page_text.strip()
            # Remove header/footer lines
            lines = cleaned_text.split('\n')
            content_lines = [l for l in lines if 'Programa Analítico de Artes' not in l and 'Programa analítico primaria' not in l]
            cleaned_text = '\n'.join(content_lines).strip()
            
            if cleaned_text:
                cur.execute(
                    "INSERT INTO orientaciones_didacticas (fase_id, lenguaje_id, descripcion) VALUES (?, ?, ?)",
                    (current_fase, current_lenguaje_od, cleaned_text)
                )
                stats['orientaciones'] += 1
                print(f"    ✅ Pág {page_num} | Orientación didáctica")
    
    conn.commit()
    pdf.close()
    
    # ─── Print Stats ──────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("[4/5] ESTADÍSTICAS DE EXTRACCIÓN")
    print("=" * 60)
    print(f"  Contenidos nacionales: {stats['contenidos_nacionales']}")
    print(f"  Contenidos estatales:  {stats['contenidos_estatales']}")
    print(f"  PDAs:                  {stats['pdas']}")
    print(f"  Orientaciones:         {stats.get('orientaciones', 0)}")
    
    # ─── Export JSON ──────────────────────────────────────────────────────
    print(f"\n[5/5] Exportando JSON a {JSON_PATH}...")
    
    export_data = {
        'fases': [],
        'grados': [],
        'lenguajes': [],
        'contenidos_nacionales': [],
        'contenidos_estatales': [],
        'pdas': [],
        'orientaciones_didacticas': []
    }
    
    for row in cur.execute("SELECT id, nombre FROM fases ORDER BY id"):
        export_data['fases'].append({'id': row[0], 'nombre': row[1]})
    
    for row in cur.execute("SELECT id, fase_id, nombre FROM grados ORDER BY id"):
        export_data['grados'].append({'id': row[0], 'fase_id': row[1], 'nombre': row[2]})
    
    for row in cur.execute("SELECT id, nombre FROM lenguajes_artisticos ORDER BY id"):
        export_data['lenguajes'].append({'id': row[0], 'nombre': row[1]})
    
    for row in cur.execute("SELECT id, fase_id, descripcion FROM contenidos_nacionales ORDER BY id"):
        export_data['contenidos_nacionales'].append({'id': row[0], 'fase_id': row[1], 'descripcion': row[2]})
    
    for row in cur.execute("SELECT id, contenido_nacional_id, fase_id, lenguaje_id, descripcion FROM contenidos_estatales ORDER BY id"):
        export_data['contenidos_estatales'].append({
            'id': row[0], 'contenido_nacional_id': row[1], 'fase_id': row[2],
            'lenguaje_id': row[3], 'descripcion': row[4]
        })
    
    for row in cur.execute("SELECT id, contenido_estatal_id, grado_id, lenguaje_id, grado_numero, descripcion FROM pdas ORDER BY id"):
        export_data['pdas'].append({
            'id': row[0], 'contenido_estatal_id': row[1], 'grado_id': row[2],
            'lenguaje_id': row[3], 'grado_numero': row[4], 'descripcion': row[5]
        })
    
    for row in cur.execute("SELECT id, fase_id, lenguaje_id, descripcion FROM orientaciones_didacticas ORDER BY id"):
        export_data['orientaciones_didacticas'].append({
            'id': row[0], 'fase_id': row[1], 'lenguaje_id': row[2], 'descripcion': row[3]
        })
    
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)
    
    print(f"  ✅ JSON exportado exitosamente")
    
    # ─── Validation Queries ───────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("VALIDACIÓN")
    print("=" * 60)
    
    print("\n📊 PDAs por fase y lenguaje:")
    query = """
    SELECT f.nombre AS fase, la.nombre AS lenguaje, COUNT(p.id) AS total_pdas
    FROM pdas p
    JOIN grados g ON p.grado_id = g.id
    JOIN fases f ON g.fase_id = f.id
    JOIN lenguajes_artisticos la ON p.lenguaje_id = la.id
    GROUP BY f.nombre, la.nombre
    ORDER BY f.nombre, la.nombre
    """
    for row in cur.execute(query):
        print(f"  {row[0]} | {row[1]:20s} | {row[2]} PDAs")
    
    print("\n📊 Contenidos nacionales por fase:")
    for row in cur.execute("SELECT f.nombre, COUNT(cn.id) FROM contenidos_nacionales cn JOIN fases f ON cn.fase_id = f.id GROUP BY f.nombre"):
        print(f"  {row[0]}: {row[1]} contenidos")
    
    print("\n📊 Muestra - PDAs de Música, Fase 3:")
    query = """
    SELECT p.grado_numero, p.descripcion, cn.descripcion AS contenido_nacional
    FROM pdas p
    JOIN contenidos_estatales ce ON p.contenido_estatal_id = ce.id
    JOIN contenidos_nacionales cn ON ce.contenido_nacional_id = cn.id
    JOIN lenguajes_artisticos la ON p.lenguaje_id = la.id
    WHERE la.nombre = 'Música' AND cn.fase_id = 1
    ORDER BY p.grado_numero
    LIMIT 6
    """
    for row in cur.execute(query):
        print(f"  Grado {row[0]}° | PDA: {row[1][:70]}...")
        print(f"           CN: {row[2][:70]}...")
    
    conn.close()
    print("\n✅ Extracción completada exitosamente.")


if __name__ == '__main__':
    main()
