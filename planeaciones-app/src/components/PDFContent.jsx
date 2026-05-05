export default function PDFContent() {
  return (
    <div className="bg-white p-6 md:p-12 animate-fade-in w-full text-left rounded-3xl shadow-xl border border-slate-100">
      <p className="text-slate-500 text-sm md:text-base leading-relaxed mb-6 font-medium">
        Contenidos nacionales relacionado con las Artes Cuarta fase 
        Ø Reconocimiento y reflexión sobre el uso de elementos de los lenguajes artísticos, en manifestaciones culturales y artísticas de la comunidad y del resto del mundo. 
        Ø Creación de propuestas con intención artística para mejorar la escuela y el resto de la comunidad. 
        Ø Lectura y creación de poemas, canciones y juegos de palabras para su disfrute. 
        Ø Experimentación con elementos visuales y sonoros en producciones colectivas artísticas. 
        Ø Reflexión y uso de los lenguajes artísticos, para recrear experiencias estéticas que tienen lugar en la vida cotidiana. 
        Ø Representación de hechos y experiencias significativas mediante el empleo de recursos textuales, visuales, corporales y sonoros. 
        Ø Identificación del uso de la fantasía y la realidad en diferentes manifestaciones culturales y artísticas. 
        Ø Lectura dramatizada y representación teatral. 
        Ø Comprensión y producción de cuentos para su disfrute.
      </p>

      <h4 className="text-xl font-black text-blue-600 mt-10 mb-4 border-l-4 border-blue-500 pl-4">
        Contenido nacional: Lectura y creación de poemas, canciones y juegos de palabras para su disfrute
      </h4>
      <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
        <p className="text-slate-700 text-sm leading-relaxed">
          <strong>Contenido estatal de música:</strong> Conocimiento de los elementos de la música y los identifica en las canciones que canta o escucha.
        </p>
      </div>

      <h4 className="text-xl font-black text-indigo-600 mt-10 mb-4 border-l-4 border-indigo-500 pl-4">
        Contenido nacional: Reconocimiento y reflexión sobre el uso de elementos de los lenguajes artísticos
      </h4>
      <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
        <p className="text-slate-700 text-sm leading-relaxed">
          <strong>Contenido estatal de música:</strong> Conocimiento de los elementos de la música y los identifica en las canciones que canta y escucha.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block">PDA 3°</span>
            <p className="text-slate-800 text-sm font-medium">Exploración y combinación de sonidos y palabras para el juego con su acomodo y entonación.</p>
        </div>
        <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 block">PDA 4°</span>
            <p className="text-slate-800 text-sm font-medium">Composición de letras de canciones considerando los elementos rítmicos y melódicos.</p>
        </div>
      </div>

      <footer className="mt-20 pt-10 border-t border-slate-100 text-center">
        <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Programa Analítico de Artes 2025 • Fase 4</p>
      </footer>
    </div>
  );
}