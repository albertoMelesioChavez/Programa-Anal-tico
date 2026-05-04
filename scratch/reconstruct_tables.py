import re
import os

def format_grid_as_table(columns_data, headers):
    max_rows = max(len(col) for col in columns_data)
    table = "| " + " | ".join(headers) + " |\n"
    table += "| " + " | ".join(["---"] * len(headers)) + " |\n"
    
    for i in range(max_rows):
        row = []
        for col in columns_data:
            if i < len(col):
                row.append(col[i].replace("\n", " ").strip())
            else:
                row.append("")
        table += "| " + " | ".join(row) + " |\n"
    
    return table

# Manually defined items based on file analysis to ensure accuracy
fase3_musica = [
    "Acompañamiento de canciones utilizando sonidos y silencios producidos con diferentes partes del cuerpo.",
    "Diferenciación de las cualidades del sonido (duración e intensidad, altura y timbre).",
    "Recreación de paisajes sonoros mediante la exploración de las cualidades del sonido.",
    "Representación de sensaciones que producen la escucha de piezas musicales a través de la danza, artes visuales o teatro.",
    "Desarrollo de audición e interpretación de canciones haciendo discriminación en las cualidades del sonido.",
    "Construcción de distintitos instrumentos de percusión utilizando materiales de uso cotidiano para improvisar acompañamientos rítmicos de canciones.",
    "Ejecución del pulso en diversas melodías con el cuerpo, objetos o instrumentos de percusión para presentarlas frente a un público."
]

fase3_danza = [
    "Exploración del movimiento corporal en niveles (alto, medio y bajo) y alcances (cerca-lejos, extensión y contracción).",
    "Realización de movimientos con diferentes segmentos corporales de elementos de la naturaleza y del entorno.",
    "Preparación de secuencias sencillas donde se ubique en el espacio general y en el personal.",
    "Experimentación de las posibilidades del movimiento, utilizando los elementos de tiempo, energía y espacio.",
    "Creación de secuencias cortas y movimiento utilizando distintos ejes corporales.",
    "Realización de montaje coreográfico de una ronda y/o danza creativa con temática."
]

fase3_artes = [
    "Distinción de elementos plásticos de las artes visuales para la representación en diversas producciones (el punto y la línea).",
    "Uso de las posibilidades expresivas de la línea y el punto en la creación de formas.",
    "Utilización de posibilidades plásticas de las formas considerando su relación con el fondo.",
    "Elaboración de dibujo libre y reconocimiento de la bidimensionalidad.",
    "Uso del color como un elemento plástico en la creación de imágenes.",
    "Comparación de sensaciones que le producen las texturas de diferentes objetos percibidos por el tacto y la vista.",
    "Representación de ritmos visuales en imágenes, a partir de diferentes formas.",
    "Elaboración de producciones bidimensionales utilizando diversas formas básicas, orgánicas y accidentadas."
]

fase3_teatro = [
    "Utilización de la expresión corporal para la comunicación de ideas y sentimientos.",
    "Uso de expresiones corporales para la comunicación de eventos de su vida cotidiana.",
    "Uso de los sentidos en la evocación de formas, olores, sonidos, texturas y sabores de su entorno.",
    "Expresión de sensaciones y comunicación de ideas con el uso de las posibilidades de su voz.",
    "Representación de ideas utilizando la expresión corporal y verbal en diferentes situaciones.",
    "Exploración del movimiento y el uso consciente de las partes del cuerpo para la expresión de ideas, emociones y la creación de la relación escénica con otras personas.",
    "Distinción y utilización de rasgos principales de un personaje como (movimientos, gestos y voz) a partir de ideas, frases, imágenes, canciones o cuentos."
]

fase4_musica = [
    "Distinción visual y auditiva de las familias instrumentales.",
    "Elaboración de distintos instrumentos de percusión (idiófonos, membranófonos), de viento y de cuerda, utilizando objetos de uso cotidiano.",
    "Conocimiento de los elementos de la música y los identifica en las canciones que canta o escucha.",
    "Identificación de los tres planos en que puede escucharse la música.",
    "Formación de un ensamble musical para presentarlo frente al público."
]

fase4_danza = [
    "Identificación de las formas de trabajo grupal dentro de una creación dancística.",
    "Exploración de movimientos de aproximación y lejanía relacionándose con objetos y compañeros en el espacio personal y general.",
    "Indagación de historias y leyendas de su entrono o de otras regiones acerca de la danza.",
    "Creación de secuencias de movimiento y figuras espaciales en grupos (dúos, tríos, cuartetos, etc.)",
    "Aplicación de conocimientos adquiridos para crear una danza o un baile colectivo de tu región.",
    "Realización de trazos coreográficos (desplazamientos y trayectorias de forma grupal o individual en el espacio general).",
    "Creación de un montaje dancístico en colectivo a partir de una creación dancística con un tema sugerido: diseño y elaboración de maquillaje, entre otros.",
    "Montaje de un baile o danza de tu entidad."
]

fase4_artes = [
    "Observación de diversas imágenes artísticas y de su entorno donde se aprecien los colores (primarios y secundarios) del circulo cromático y su presencia en la vida cotidiana.",
    "Identificación de representaciones bidimensionales y tridimensionales donde estén presentes diferentes formatos, soportes y materiales.",
    "Realización de producciones visuales que permitan observar y comparar el uso del color según su clasificación básica.",
    "Reconocimiento del impacto visual que produce el contraste de los colores complementarios y lo emplea en la elaboración de producciones artísticas.",
    "Utilización del color como elemento expresivo para comunicar ideas, en la creación de obras visuales donde utilicen gamas cromáticas (Cálidas y frías)",
    "Elaboración de dibujos utilizando plano y perspectiva.",
    "Realización de una composición empleando una técnica pictórica.",
    "Elaboración de bocetos y dibujos para crear producciones visuales."
]

fase4_teatro = [
    "Identificación de las zonas del escenario para conocer las posibilidades de interacción que tiene con cada una: el público, otros actores, la escenografía y el mismo.",
    "Investigación sobre las narraciones de su comunidad o de otras regiones para crear diálogos sencillos, de historias ficticias y/o de realidad.",
    "Identificación de los elementos que constituyen una obra de teatro: inicio, desarrollo, nudo o conflicto, desenlace o cierre.",
    "Creación de una historia de su comunidad con pequeños diálogos.",
    "Expresión e interpretación de sensaciones para comunicar ideas utilizando las posibilidades de su voz.",
    "Investigación sobre tradiciones culturales (ritual, religioso y festivo) de México donde se fabrican y utilizan mascaras.",
    "Elaboración de una máscara u otros objetos para la representación de un personaje en un escenario."
]

fase5_musica = [
    "Aplicación de técnicas de respiración en la emisión vocal en la práctica del canto.",
    "Identificación y graficación de la notación musical.",
    "Conocimiento e identificación del compás musical en las canciones que escucha.",
    "Conocimiento e identificación auditiva de las características de los diferentes géneros musicales.",
    "Creación de polirritmias para el acompañamiento musical.",
    "Conformación de una orquesta de percusiones para presentarla frente al público"
]

fase5_artes = [
    "Comprensión de la tridimensionalidad por medio de objetos que se encuentren en el entorno.",
    "Investigación sobre diferentes procesos y materiales para diseñar y construir esculturas.",
    "Recopilación de imágenes de obras de arte, objetos o artefactos, películas o fotografías de diferentes épocas para comprender y discutir la memoria de la importancia del patrimonio tangible como parte del pueblo.",
    "Observación de los bienes muebles e inmuebles de valor cultural (patrimonio arquitectónico) que existen en su comunidad, estado, región o en el país.",
    "Valora la importancia de conservar y difundir el patrimonio artístico mexicano.",
    "Exploración de diferentes procesos y materiales en la creación de obras tridimensionales.",
    "Creación de una obra bidimensional o tridimensional a partir de elementos de su entorno que hagan referencia a sucesos relevantes de su comunidad.",
    "Creación de obras tridimensionales con movimiento, utilizando diferentes soportes procesos y materiales con los que se puedan experimentar las diferentes formas."
]

fase5_teatro = [
    "Investigación de obras de teatro mexicanas de los géneros de comedia y tragedia.",
    "Identificación de las características tonales (voz, carácter) de los personajes que aparecen en una historia.",
    "Selección de un tema de su comunidad para escribir una obra de teatro que contenga todos los elementos de un género.",
    "Creación de títeres para representar personajes de obras, considerando sus características físicas, personalidad, forma de ser y de comportarse.",
    "Elaboración del escenario adecuado para ambientar una puesta en escena con materiales diversos.",
    "Realización del montaje de una puesta en escena con títeres, o bien, en teatro corporal ante un público.",
    "Investigación de obras de teatro mexicanas de los géneros de comedia y tragedia.",
    "Identificación de las características tonales (voz, carácter) de los personajes que aparecen en una historia."
]

fase5_danza = [
    "Identificación de diferentes movimientos que pueden manejarse mediante el uso de distintos tipos de música.",
    "Interpretación de un género dancístico utilizando elementos coreográficos.",
    "Investigación de una danza o baile de su comunidad o de otra región.",
    "Construcción colectiva de una representación dancística integrando elementos de la cultura local regional o nacional.",
    "Diferenciación entre una danza o baile de México y del mundo.",
    "Selección de un baile popular mexicano o de Latinoamérica.",
    "Interpretación de un baile regional mexicano o del mundo.",
    "Presentación y reflexión de los bailes folclóricos como parte del patrimonio cultural."
]

# Generate Markdown tables
table3 = format_grid_as_table([fase3_musica, fase3_danza, fase3_artes, fase3_teatro], ["Música", "Danza", "Artes visuales", "Teatro"])
table4 = format_grid_as_table([fase4_musica, fase4_danza, fase4_artes, fase4_teatro], ["Música", "Danza", "Artes visuales", "Teatro"])
table5 = format_grid_as_table([fase5_musica, fase5_artes, fase5_teatro, fase5_danza], ["Música", "Artes visuales", "Teatro", "Danza"])

rubric_formativa_1 = """| Criterio | Indicador observable | Técnica / Instrumento |
| --- | --- | --- |
| Reconoce la intensidad del sonido | Identifica si un sonido es fuerte o suave mediante gestos, tarjetas o palabras | Observación directa / lista de cotejo |
| Identifica el timbre | Relaciona un sonido con su fuente (instrumento, objeto, animal) | Preguntas orales / diálogo. |
| Aplica lo aprendido en contexto lúdico | Recrea sonidos cotidianos con creatividad | Registro anecdótico del docente |"""

rubric_formativa_2 = """| Criterio | Nivel logrado |
| --- | --- |
| Identifica y aplica los niveles del movimiento (alto, medio, bajo) | ☐ Sí / ☐ En proceso / ☐ No |
| Realiza movimientos con alcances variados (cerca-lejos, extensión-contracción) | ☐ Sí / ☐ En proceso / ☐ No |
| Participa activamente y representa elementos del entorno natural con movimientos corporales | ☐ Sí / ☐ En proceso / ☐ No |"""

rubric_formativa_3 = """| Aspectos a evaluar | Con debilidad | Satisfactorio | Excelente |
| --- | --- | --- | --- |
| Participa activamente en la elección del tema y propuesta. | | | |
| Colabora y respeta su rol dentro del ensamble. | | | |
| Mantiene ritmo y coordinación durante el ensayo y presentación. | | | |
| El mensaje artístico es claro y se relaciona con la mejora de la escuela o comunidad. | | | |"""

print("---TABLE3---")
print(table3)
print("---TABLE4---")
print(table4)
print("---TABLE5---")
print(table5)
print("---RUBRIC1---")
print(rubric_formativa_1)
print("---RUBRIC2---")
print(rubric_formativa_2)
print("---RUBRIC3---")
print(rubric_formativa_3)
