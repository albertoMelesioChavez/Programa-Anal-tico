const Database = require('better-sqlite3');
const path = require('path');

// Define connection
const dbPath = path.resolve(process.cwd(), 'database/app.db');
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Initializing database schema...');

db.exec(`
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
    fase_id INTEGER NOT NULL,
    lenguaje_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    FOREIGN KEY (fase_id) REFERENCES fases(id),
    FOREIGN KEY (lenguaje_id) REFERENCES lenguajes_artisticos(id)
  );

    CREATE TABLE IF NOT EXISTS pdas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grado_id INTEGER NOT NULL,
    lenguaje_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    FOREIGN KEY (grado_id) REFERENCES grados(id),
    FOREIGN KEY (lenguaje_id) REFERENCES lenguajes_artisticos(id)
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
    metodologia TEXT,
    actividades TEXT,
    recursos TEXT,
    evaluacion TEXT,
    FOREIGN KEY (fase_id) REFERENCES fases(id),
    FOREIGN KEY (grado_id) REFERENCES grados(id),
    FOREIGN KEY (lenguaje_id) REFERENCES lenguajes_artisticos(id),
    FOREIGN KEY (contenido_nacional_id) REFERENCES contenidos_nacionales(id),
    FOREIGN KEY (contenido_estatal_id) REFERENCES contenidos_estatales(id),
    FOREIGN KEY (pda_id) REFERENCES pdas(id)
  );
`);

console.log('Inserting seed data...');

// Initialize Catalog Data
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
