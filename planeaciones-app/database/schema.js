const Database = require('better-sqlite3');
const path = require('path');

// Define connection
const dbPath = path.resolve(process.cwd(), 'database/app.db');
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Initializing database schema...');

db.exec(`
  CREATE TABLE IF NOT EXISTS campos_formativos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ejes_articuladores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT
  );

  CREATE TABLE IF NOT EXISTS fases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS grados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fase_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    FOREIGN KEY (fase_id) REFERENCES fases(id)
  );

  CREATE TABLE IF NOT EXISTS lenguajes_artisticos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contenidos_nacionales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fase_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    FOREIGN KEY (fase_id) REFERENCES fases(id)
  );

  CREATE TABLE IF NOT EXISTS contenidos_estatales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contenido_nacional_id INTEGER NOT NULL,
    fase_id INTEGER NOT NULL,
    lenguaje_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    FOREIGN KEY (contenido_nacional_id) REFERENCES contenidos_nacionales(id),
    FOREIGN KEY (fase_id) REFERENCES fases(id),
    FOREIGN KEY (lenguaje_id) REFERENCES lenguajes_artisticos(id)
  );

  CREATE TABLE IF NOT EXISTS pdas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contenido_estatal_id INTEGER NOT NULL,
    grado_id INTEGER NOT NULL,
    lenguaje_id INTEGER NOT NULL,
    grado_numero INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    FOREIGN KEY (contenido_estatal_id) REFERENCES contenidos_estatales(id),
    FOREIGN KEY (grado_id) REFERENCES grados(id),
    FOREIGN KEY (lenguaje_id) REFERENCES lenguajes_artisticos(id)
  );

  CREATE TABLE IF NOT EXISTS orientaciones_didacticas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fase_id INTEGER NOT NULL,
    lenguaje_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    FOREIGN KEY (fase_id) REFERENCES fases(id),
    FOREIGN KEY (lenguaje_id) REFERENCES lenguajes_artisticos(id)
  );

  CREATE TABLE IF NOT EXISTS actividades_libro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    libro TEXT NOT NULL,
    grado INTEGER,
    pagina INTEGER,
    titulo_proyecto TEXT,
    lenguaje_artistico TEXT,
    campo_formativo TEXT,
    ejes_articuladores TEXT,
    producto TEXT,
    fase_id INTEGER,
    FOREIGN KEY (fase_id) REFERENCES fases(id)
  );

  CREATE TABLE IF NOT EXISTS material_consulta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lenguaje TEXT,
    recurso TEXT NOT NULL,
    url TEXT
  );

  CREATE TABLE IF NOT EXISTS planeaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    titulo TEXT NOT NULL,
    fase_id INTEGER NOT NULL,
    grado_id INTEGER NOT NULL,
    lenguaje_id INTEGER NOT NULL,
    contenido_nacional_id INTEGER,
    contenido_estatal_id INTEGER,
    pda_id INTEGER,
    ejes_articuladores TEXT,
    metodologia TEXT,
    actividades TEXT,
    recursos TEXT,
    evaluacion TEXT,
    secuencia_inicio TEXT,
    secuencia_desarrollo TEXT,
    secuencia_cierre TEXT,
    FOREIGN KEY (fase_id) REFERENCES fases(id),
    FOREIGN KEY (grado_id) REFERENCES grados(id),
    FOREIGN KEY (lenguaje_id) REFERENCES lenguajes_artisticos(id),
    FOREIGN KEY (contenido_nacional_id) REFERENCES contenidos_nacionales(id),
    FOREIGN KEY (contenido_estatal_id) REFERENCES contenidos_estatales(id),
    FOREIGN KEY (pda_id) REFERENCES pdas(id)
  );
`);

console.log('Inserting seed data...');

// Initialize Campos Formativos
const insertCF = db.prepare('INSERT OR IGNORE INTO campos_formativos (nombre) VALUES (?)');
insertCF.run('Lenguajes');
insertCF.run('Saberes y Pensamiento Científico');
insertCF.run('Ética, Naturaleza y Sociedades');
insertCF.run('De lo Humano y lo Comunitario');

// Initialize Ejes Articuladores
const insertEje = db.prepare('INSERT OR IGNORE INTO ejes_articuladores (nombre, descripcion) VALUES (?, ?)');
insertEje.run('Inclusión', 'Reconocimiento de la diversidad y la equidad en el acceso a oportunidades educativas.');
insertEje.run('Pensamiento Crítico', 'Desarrollo de la capacidad de análisis, reflexión y argumentación.');
insertEje.run('Interculturalidad Crítica', 'Valoración de la diversidad cultural y el diálogo entre culturas.');
insertEje.run('Igualdad de Género', 'Promoción de relaciones equitativas entre géneros.');
insertEje.run('Vida Saludable', 'Fomento de hábitos y prácticas para el bienestar integral.');
insertEje.run('Apropiación de las Culturas a través de la Lectura y la Escritura', 'Desarrollo de competencias lectoras y escritoras como herramientas culturales.');
insertEje.run('Artes y Experiencias Estéticas', 'Desarrollo de la sensibilidad, percepción, imaginación y creatividad a través de las artes.');

// Initialize Fases
const insertFase = db.prepare('INSERT OR IGNORE INTO fases (nombre) VALUES (?)');
insertFase.run('Fase 3');
insertFase.run('Fase 4');
insertFase.run('Fase 5');

const insertGrado = db.prepare('INSERT OR IGNORE INTO grados (fase_id, nombre) VALUES (?, ?)');
// Fase 3 (id=1)
insertGrado.run(1, '1º Grado');
insertGrado.run(1, '2º Grado');
// Fase 4 (id=2)
insertGrado.run(2, '3º Grado');
insertGrado.run(2, '4º Grado');
// Fase 5 (id=3)
insertGrado.run(3, '5º Grado');
insertGrado.run(3, '6º Grado');

const insertLenguaje = db.prepare('INSERT OR IGNORE INTO lenguajes_artisticos (nombre) VALUES (?)');
insertLenguaje.run('Música');
insertLenguaje.run('Danza');
insertLenguaje.run('Artes Visuales');
insertLenguaje.run('Teatro');

console.log('Database initialized successfully.');
