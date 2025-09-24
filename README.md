# Menú de un restaurante
# Restaurante ZenTao Buffet.

Vamos a diseñar una aplicación web para la gestión y visualización de la carta de un restaurante. El usuario podrá consultar toda la información sobre el restaurante, todos los tipos de menús, la carta completa y navegar de forma intuitiva entre las distintas secciones de la web. 

Básicamente, en la página principal o de inicio, aparecerá el nombre del restaurante y una barra de navegación con botones como “Inicio”, “Cartas”, “Menú del día”, “Dónde encontrarnos”, “Contacto”, etc. También habrá en el inicio información sobre el restaurante, imágenes, lo típico y a lo mejor añadimos un botón de “Descubre nuestra carta” que hará de hipervínculo y hará la misma función que el botón “Cartas” de la barra de navegación.  La idea principal es la siguiente: En el destino de enlace “cartas” estará la carta principal con todos los platos y los diferentes tipos de menú (vegetariano, menú del día, infantil, etc.), habrá hipervínculos en cada tipo de menú, clicando en uno te llevará a ese menú específicamente. En el destino de enlace “Menú del día” pues estará el menú del día, este menú es el mismo que el que aparecerá en “Cartas”, la opción de menú del día que estará en “Cartas” llevará al mismo sitio que el botón “Menú del día” de de la barra de navegación. En “Dónde encontrarnos” estará la dirección del restaurante y en “Contacto” habrá información extra sobre el restaurante como el número de teléfono o correo electrónico.  

Desarrollado por:

-Zhiyang Ni | z.ni.2024@alumnos.urjc.es | Yxng22 
-Iñigo Pérez Martínez | i.perezma.2024@alumnos.urjc.es | inigoPz 
-Miguel Ángel Abián Arienza | ma.abian.2024@alumnos.urjc.es | zeta-16 
-Ahmed Ehab | a.ehab.2024@alumnos.urjc.es | ahmed234fgtv 

Funcionalidad: 

● Entidades: La entidad central del sistema son los platos que forman los menús del restaurante. Cada plato tendrá atributos que describen su identidad y características, tales como nombre, descripción detallada, categoría (por ejemplo, entrante, plato principal o postre) y precio. Estos atributos permiten a los usuarios conocer y distinguir las distintas opciones disponibles. La entidad secundaria podría ser los ingredientes que conforman cada plato. Cada ingrediente contará con información relevante como el nombre corto, descripción, origen, y detalles nutricionales o relacionados con posibles restricciones alimenticias (por ejemplo, si es apto para veganos o si incluye alérgenos comunes). 

● Imágenes: En la página de inicio se podrá poner imágenes del restaurante, de los mejores platos, etc. Y luego en la carta o/y en los menús se pondrá imágenes de los diferentes platos que haya.  

● Buscador, filtrado o categorización: En la carta principal se puede añadir: un buscador para buscar los nombres de los platos, un filtro para identificar los platos que contengan ciertos alérgenos por ejemplo, y una forma para categorizar los diferentes tipos de platos por ejemplo (entrantes, principales, postres, etc.).
