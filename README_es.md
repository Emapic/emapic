
![Logo of Emapic](public/images/logo_bluefont.png)

##### [English](README_en.md)

# Emapic

__Motor de encuestas geolocalizadas.__

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.png?v=103)](https://github.com/ellerbrock/open-source-badges/) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](http://www.gnu.org/licenses/agpl-3.0) [![Code Climate](https://codeclimate.com/github/Emapic/emapic/badges/gpa.svg)](https://codeclimate.com/github/Emapic/emapic)

Repositorio abierto del código fuente del motor de encuestas con componente geográfico Emapic, desarrollado por el laboratorio [CartoLAB](http://cartolab.udc.es/cartoweb/) de la [Universidade da Coruña](http://www.udc.es/). En producción en el sitio web [emapic.es](https://emapic.es).

## Estado actual

Emapic se encuentra todavía en versión alfa a la espera tanto de añadir más funcionalidades que consideramos esenciales como de mejorar ciertos aspectos y solucionar los posibles bugs que todavía tenga.

El desarrollo comenzó en 2014 con un pequeño prototipo a nivel interno, que posteriormente creció hasta ser una aplicación web real en 2015.

## Tecnologías empleadas

El código de servidor está basado en el entorno de ejecución de aplicaciones [Node.js](https://nodejs.org/), que emplea código [JavaScript](https://en.wikipedia.org/wiki/JavaScript).

Puedes ver un listado más detallado de las tecnologías, librerías y fuentes de datos empleadas en [nuestra web](https://emapic.es/know_more/technologies).

## Despliegue básico de la aplicación

### Prerrequisitos

Para poder ejecutar Emapic en local en un entorno Unix necesitas antes de empezar:

* [git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) (>=5.10.0) [recomendamos el uso de [nvm](https://github.com/creationix/nvm) para la instalación de versiones específicas de _Node.js_]
* [npm](https://www.npmjs.com/) (normalmente ya instalado con Node.js)
* [PostgreSQL](https://www.postgresql.org/) (>=9.2)
* [PostGIS](http://postgis.net/) (>=2.0)

Además se necesita el módulo _unaccent_ de PostgreSQL con el fin de poder ejecutar búsquedas sobre textos con tildes y similares. Éste se puede instalar fácilmente en sistemas Debian y derivados mediante el paquete __postgresql-contrib__.  
Recomendamos encarecidamente su instalación, pero en caso de considerar que no necesitas la extensión por algún motivo (e.g. se va a instalar de manera privada y el idioma del usuario no emplea acentos), puedes eliminar su uso borrando los comandos SQL que la crean y la borran en los archivos _db/deploy/extensions.sql_ y _db/revert/extensions.sql_, eliminando su SELECT en _db/verify/extensions.sql_, y quitando su referencia al crear la configuración de búsqueda en _db/deploy/extensions.sql_.

Aunque por defecto esta opción viene desactivada, si queremos que el servidor escanee los ficheros subidos de manera automática en busca de virus, deberemos tener instalado el antivirus [ClamAV](https://www.clamav.net/). En sistemas Debian y derivados podemos instalarlo fácilmente mediante el paquete __clamav__. Recomendamos encarecidamente instalar también el _daemon_ correspondiente, en Debian y derivados mediante el paquete __clamav-daemon__. Aunque la aplicación puede escanear archivos manualmente sin el _daemon_, el tiempo de los escaneos sufre un retraso muy importante, pasando habitualmente de unas centésimas de segundo a más de diez segundos, resultando en respuestas muy tardías por parte del servidor. La aplicación usará automáticamente el comando del _daemon_ en lugar del manual siempre que esté disponible. Una vez que tenemos instalado el antivirus, debemos acordarnos de descargar la base de datos de virus con el comando _freshclam_ y de repetir el proceso de manea periódica para mantenerla actualizada. Si tras instalar esos dos paquetes y actualizar la base de datos de virus hay cualquier problema, recomendamos consultar directamente [la documentación de instalación de ClamAV](https://www.clamav.net/documents/installing-clamav).

También recomendamos para desarrolladores que quieran trabajar sobre nuestro código:

* [Sqitch](http://sqitch.org/) >= 0.9994  
De entre los métodos de instalación ofrecidos por Sqitch creemos que el más accesible es «Apt + cpanminus».

### Preparación de la aplicación

Primero descargamos el repositorio git de Emapic y entramos en él:

```
git clone https://github.com/Emapic/emapic.git
cd emapic
```

#### Base de datos

La base de datos puede ser restaurada mediante un script específico o mediante Sqitch.  
Si no tienes previsto realizar desarrollo sobre nuestro código o realizar actualizaciones sobre la versión instalada, te recomendamos que emplees el script por ser más sencillo y no requerir herramientas adicionales. En caso contrario, Sqitch es más recomendable para facilitar la aplicación de futuros cambios en la base de datos.

##### Script

Entramos en la carpeta _db_ dentro del repositorio:

```
cd db
```

El fichero _db.sh_ dentro de esta carpeta es el empleado para construir la BDD. Por defecto creará una BDD de nombre «emapic» y un usuario de BDD «emapic» con contraseña «emapic» para acceder a ella desde la aplicación.  Finalmente introducirá un usuario de prueba también de nombre «emapic» y contraseña «emapic» para acceder a la propia aplicación web. Para ello accederá con el usuario «postgres», contraseña «postgres» al servidor local en el puerto por defecto (5432). Este script require que _sed_ esté instalado y accesible para poder realizar una serie de sustituciones en varios ficheros.
Si alguno de estos datos no es correcto, especialmente los relativos al usuario administrador o al servidor, edita el documento y cámbialos en las primeras líneas. A continuación:
```
./db.sh
```
Al terminar el proceso, la BDD ya debería estar operativa.

##### Sqitch

[Sqitch](http://sqitch.org/) es una utilidad que nos permite gestionar el versionado del modelo de la base de datos, pudiendo aplicar o revertir los cambios con facilidad entre distintas versiones.  
Para restaurar la base de datos con Sqitch, primero entramos en la carpeta _db_ dentro del repositorio:

```
cd db
```

En esta carpeta se encuentra el fichero _sqitch.conf_, que contiene la configuración para la restauración de la base de datos. Los campos que deberemos revisar son:


* «uri» dentro de «[target "emapic"]»: aquí se especifica la cadena de conexión a la base de datos. Por defecto se intentará conectar con el usuario «postgres», contraseña «postgres» al servidor local en el puerto por defecto (5432).  
Si alguno de estos datos no es correcto, deberás retocar la cadena de conexión con el siguiente formato (sustituir las cadenas de texto rodeadas por llaves por los valores correspondientes):  

        db:pg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}

* «emapic_db_user» dentro de «[deploy "variables"]», «[verify "variables"]» y «[revert "variables"]»: el nombre del usuario de base de datos con el que Emapic se conectará para acceder a los datos.  
Por defecto, con el valor «emapic». En caso de querer darle un nombre distinto, puedes hacerlo simplemente editando este documento y cambiando el nombre de usuario, o añadiendo el parámetro «-s emapic_db_user={emapic_db_user}» a todas las ejecuciones de Sqitch, sustituyendo la cadena de texto entre llaves por el nombre de usuario deseado.
* «emapic_db_user_pass» dentro de «[deploy "variables"]»: la contraseña del usuario de base de datos con el que Emapic se conectará para acceder a los datos.  
Por defecto, con el valor «emapic». Se recomienda cambiarla por una contraseña más segura. Para cambiarla, puedes hacerlo simplemente editando este documento y cambiando su valor, o añadiendo el parámetro «-s emapic_db_user_pass={emapic_db_user_pass}» a la ejecución de deploy de  Sqitch, sustituyendo la cadena de texto entre llaves por la contraseña deseada.

Una vez que la configuración de Sqitch sea correcta, simplemente deberemos ejecutar:

```
sqitch deploy
```

Al terminar el proceso, la BDD ya debería estar operativa.

Este método no añade ningún usuario por defecto a la aplicación. Para hacerlo deberemos ejecutar sobre la BDD el script SQL _emapic\_test\_user.sql_, que añadirá un usuario de prueba de nombre «emapic» y contraseña «emapic» para acceder a la propia aplicación web.

##### Acerca de los cambios en _sqitch.plan_

Aunque intentamos evitarlo, hemos tenido que actualizar algunos commits de sqitch antiguos dentro del fichero _sqitch.plan_. Esto provoca que sqitch lance un error si intentamos aplicar commits nuevos en una base de datos construida con la antigua versión de dichos commits. El hash empleado internamente por sqitch para identificar esos commits es el principal motivo, ya que su valor es distinto con cualquier cambio. Si esto ocurre, existen algunas estrategias para solucionar/evitar el problema:

* La más sencilla es, obviamente, desplegar la base de datos de nuevo desde cero, probablemente la mejor opción si no tienes datos importantes almacenados o no te importa hacer una copia de seguridad de ellos y restaurarlos en la base de datos nueva. Ten en cuenta que perderás tu antiguo log de sqitch.

* Puedes intentar hacer un rebase hasta los commits de sqitch actualizados (esto equivale a revertirlos y aplicarlos de nuevo). De nuevo es probable que necesites hacer una copia de seguridad de tus datos y restaurarlos si no los quieres perder (depende de los commits que haya que revertir).

* Renombra/borra el esquema «sqitch» en tu base de datos de Emapic, despliega de nuevo la base de datos con un nombre distinto (o en un servidor distinto), haz una copia de seguridad del esquema «sqitch» de esta base de datos nueva y restáurala en la antigua. Si hubiere algún commit nuevo sin aplicar en tu base de datos antigua, deberías aplicarlos manualmente ejecutando su sql de despliegue. La mejor opción si eres un usuario avanzado y no puedes apagar la base de datos de Emapic temporalmente o simplemente no quieres manejar copias de seguridad complejas. Si despliegas de nuevo la base de datos con un nombre distinto en el mismo servidor, ten cuidado con el usuario de base de datos de Emapic.

#### Código del servidor

Ahora para poder lanzar la aplicación primero hay que instalar los paquetes requeridos de Node.js. Dentro de la carpeta base del repositorio ejecutamos:

```
npm install
```

> ##### Instalación en entornos de 32 bits
>
> Si intentamos instalar los paquetes de Node.js en un entorno de 32 bits, lo normal es que encontremos problemas durante la instalación del paquete _sharp_, empleado para el redimensionamiento de imágenes. En este caso, lo que deberemos hacer es editar el archivo _package.json_ y eliminar la línea que indica la versión de dicho paquete a instalar, similar a ésta:
> ```
> "sharp": "0.16.2",
> ```
>
> Posteriormente ejecutamos de nuevo el comando y ya no deberíamos tener problemas, pero hay que tener en cuenta que en este caso la aplicación empleará el paquete _Jimp_ como reemplazo, el cual ofrece un rendimiento peor a la hora de redimensionar las imágenes.

La aplicación ya se puede lanzar con cualquiera de estos comandos:

```
npm run start
```
```
node server.js
```

Con un navegador deberíamos poder entrar a la web en la URL https://localhost:3000, y entrar a través de la página de login (https://localhost:3000/login) con el usuario por defecto:

__Usuario:__ emapic  
__Contraseña:__ emapic

También proporcionamos otras opciones de ejecución de la aplicación enfocadas a entornos de desarrollo:

* Para ejecutar la aplicación y que se recargue de manera automática cuando cambie cualquiera de sus ficheros de código fuente:
```
npm run autoreload
```

* Para ejecutar la aplicación y que se abra el entorno de «debugging» _node-inspector_ (requiere tener instalado alguno de los navegadores _Chrome_, _Chromium_ u _Opera_):
```
npm run debug
```

* Similar a la opción anterior pero permitiéndonos hacer «debugging» no sólo del código de Emapic sino también de sus dependencias:
```
npm run debug-full
```

### Configuración

No es necesario modificar la configuración por defecto para lanzar la aplicación en local, entrar con el usuario «emapic» y probar el motor de encuestas, pero sí lo será si queremos ponerla en producción o probar funcionalidades que requieren servicios externos (SMTP & OAuth). Sí deberemos revisar que la aplicación tenga los permisos adecuados para modificar la carpeta donde se guardarán los archivos subidos a ella (parámetro _uploadedFilesFolder_ dentro de _server_).
El fichero _config.json_ contiene la mayoría de los parámetros de configuración de la aplicación:

#### Configuración propia de Emapic (_app_)

Aquí se incluyen los parámetros de configuración de Emapic que afectan a la experiencia del usuario final. Por ahora sólo hay cuatro:

* ##### Idioma de búsqueda (_searchEngineLang_)
El idioma que se supone principal para las búsquedas realizadas sobre las encuestas, por defecto en español.  
La inmensa mayoría funcionarán igualmente en español y en idiomas «cercanos» (francés, inglés, portugués...), por lo que no se recomienda cambiarlo si no se tienen conocimientos sobre los motores de búsqueda en PostgreSQL[¹](#notas).

* ##### Tamaño de página por defecto (_defaultPageSize_)
El número de encuestas a mostrar por defecto por página en los listados.

* ##### Frecuencia de la encuesta sobre la experiencia de usuario (_emapicOpinionFreq_)
Emapic incluye una encuesta sobre la experiencia de usuario respecto al proceso de geolocalización que se muestra con cierta probabilidad tras responder a cualquier encuesta.  
Por defecto no se muestra nunca, pudiendo tener este parámetro un valor entre 0 (nunca se muestra) y 1 (se muestra siempre).

* ##### Codificación de id de encuesta (_surveyIdEncr_)
Éstos son los valores empleados para encriptar el identificador numérico de cada encuesta y traducirlo a una cadena de texto que es cómo la identificaremos en la URL.  
Sólo deberías cambiarlo si por algún motivo quieres cadenas de texto con otros caracteres o de diferente longitud.

* ##### OAuth de Emapic (_oauth_)
Los parámetros de configuración del servicio de autenticación OAuth2 proporcionado por el propio Emapic. No debemos confundirlo con los parámetros de configuración de servicios OAuth externos que se detallan más adelante. Incluyen un parámetro de valor booleano para activar/desactivar el servicio (_active_) y los tiempos de validez en segundos de los tokens de acceso y de refresco (_accessTokenLifetime_ y _refreshTokenLifetime_). Los tiempos de validez admiten el valor nulo, en cuyo caso se emplean los valores por defecto de la librería (1 hora para el token de acceso, 2 semanas para el de refresco)

#### Configuración de conexión a la BDD (_db_)

Los parámetros para conectarnos a la base de datos de Emapic: servidor (_host_), puerto (_port_), nombre de la base de datos (_database_), usuario de la base de datos (_user_) y su contraseña (_password_). Se incluyen los parámetros por defecto empleados en el script de creación de la base de datos (BDD «emapic» en local, puerto 5432, usuario «emapic» y contraseña «emapic»).  
La conexión a la BDD también se puede configurar con la variable de entorno _POSTGRESQL_DB_CONN_STRING_, que debe contener una cadena de conexión en el siguiente formato (sustituir las cadenas de texto rodeadas por llaves por los valores correspondientes):

```
postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}
```

Por ejemplo, con los valores por defecto:

```
postgresql://emapic:emapic@localhost:5432/emapic
```

#### Configuración de servicios externos con componente geográfico (_geoServices_)

Aquí se incluyen los parámetros de configuración necesarios para servicios externos con componente geográfico, principalmente empleados en el visor:

* ##### Clave de acceso a la API de [ipgeolocation](https://ipgeolocation.io) (_ipgeolocationAPIKey_)
Clave de acceso a la API de nuestra cuenta de [ipgeolocation](https://ipgeolocation.io), que nos permite obtener una posición aproximada de los usuarios a partir de su IP sin emplear la geolocalización del navegador. Se usa cuando dicha geolocalización falla o si el usuario prefiere no emplearla, con el fin de que el usuario pueda definir su posición partiendo de esa localización cercana.  
Si no tenemos cuenta y/o no vemos necesario disponer de dicha localización aproximada, podemos simplemente dejarlo en blanco y se empleará una posición por defecto en Madrid que el usuario deberá editar y colocar en su posición real.

* ##### Token de [Mapbox](https://www.mapbox.com/) (_mapboxToken_)
Token de identificación de nuestra cuenta de [Mapbox](https://www.mapbox.com/) que nos permitirá cargar la capa de satélite que ofrecen.  
Si no tenemos cuenta y/o no vemos necesario disponer de dicha capa, podemos simplemente dejarlo en blanco y se ignorará.

* ##### E-mail de contacto para [Nominatim](http://wiki.openstreetmap.org/wiki/Nominatim) (_nominatimEmail_)
Dirección de e-mail de contacto que se pasará en las peticiones hechas a [Nominatim](http://wiki.openstreetmap.org/wiki/Nominatim).  
Se puede dejar en blanco para entornos de prueba o controlados, pero si se pone la aplicación de manera pública, se recomienda especificar un e-mail con el que puedan contactar en caso de que haya algún problema con las peticiones o su volumen sea muy alto.

#### OAuth de servicios externos (_oAuth_)

Para autenticarte a través de Google o Facebook es necesario cambiar los parámetros de los grupos _oAuth.google_ y _oAuth.facebook_ respectivamente. Para ello deberemos tener registrada una aplicación en la sección de desarrolladores de sus respectivas webs y poner en el fichero el __id__ y el __secreto__.

#### Configuración interna del servidor (_server_)

Aquí se incluyen los parámetros empleados para configurar el servidor de Node.js y otros paquetes de bajo nivel:

* ##### Nombre del dominio (_domain_)
Dominio en el cual se servirá la aplicación. Necesario para configurar los callbacks de los servicios oAuth.  
Por defecto con valor para un servidor local.

* ##### Dirección IP del servidor (_ipaddr_)
Dirección IP a través de la cual el servidor servirá la aplicación web.  
Por defecto con valor para un servidor local.  
También se puede configurar con la variable de entorno _NODEJS_IP_.

* ##### Puerto en que servirá peticiones HTTPS (_httpsport_)
Puerto usado para escuchar las peticiones HTTPS.  
Normalmente sería el puerto 443, pero por defecto viene con un puerto no reservado para un servidor local de pruebas.  
También se puede configurar con la variable de entorno _NODEJS_HTTPS_PORT_.

* ##### Puerto en que servirá peticiones HTTP (_httpport_)
Puerto usado para escuchar las peticiones HTTP, que serán redirigidas a HTTPS en la mayoría de los casos.  
Normalmente sería el puerto 80, pero por defecto viene con un puerto no reservado para un servidor local de pruebas.  
También se puede configurar con la variable de entorno _NODEJS_HTTP_PORT_.

* ##### Cabecera del fichero «robots.txt» (_robotsHeader_)
Simplemente se trata de una cadena de texto que se antepone al cuerpo del fichero «robots.txt», generado dinámicamente en memoria.
No tiene efecto sobre la aplicación y podemos dejar el valor por defecto o sustituir por otra cadena introductoria que queramos.

* ##### Escaneo automático mediante ClamAV de ficheros subidos al servidor (_autoScanFiles_)
Indica si la aplicación escaneará los archivos subidos en busca de virus mediante ClamAV antes de procesar las peticiones. En caso de encontrar un archivo sospechoso, terminará la petición y borrará todos los archivos subidos por la misma.
Por defecto está desactivado. Si queremos que se realicen estos escaneos de manera automática, antes deberemos instalar en local ClamAV (más información en el [apartado de prerrequisitos](#prerrequisitos)) y asegurarnos de que los comandos _clamscan_ y/o _clamdscan_ son ejecutables por el usuario que lance la aplicación del servidor Node.js. Una vez que el antivirus esté configurado, le daríamos el valor «true» a este parámetro de configuración para activar el escaneo.

* ##### Ruta en la que guardar los ficheros subidos al servidor (_uploadedFilesFolder_)
Aquí se indica la carpeta donde queremos guardar los ficheros que los usuarios suban al servidor, principalmente en las respuestas a las encuestas. La aplicación creará también carpetas anidadas dentro de esta ruta según lo requiera. Si no es una ruta absoluta, se considerará relativa a la carpeta base del proyecto.
Por defecto se guardarán en la carpeta _uploaded_files_ que ya viene incluida con el proyecto. Sea cual sea la carpeta designada, debemos asegurarnos de que la aplicación tendrá permisos para crear carpetas y archivos dentro de la misma.

* ##### Secretos de encriptación (_secrets_)
Las cadenas empleadas para encriptar los elementos que nos permiten mantener una comunicación inequívoca entre Emapic y cada usuario web.  
Se proporcionan valores por defecto perfectamente válidos, aunque para producción se recomienda poner otras cadenas aleatorias de la misma o mayor longitud.

* ##### SSL (_ssl_)
Aquí deberemos indicar la ruta (absoluta o relativa desde la carpeta base de Emapic) de los ficheros del certificado y la clave privada SSL.  
Se incluye un certificado auto-firmado para hacer pruebas en local.

#### SMTP (_smtp_)

Es el servidor de correo saliente empleado para enviar correos a los usuarios para que activen su cuenta al registrarse y para que puedan resetear su contraseña en caso de olvidarla.  
Debes consultar en tu cuenta de servicio de correo electrónico para activar el servicio de SMTP e introducir los datos que correspondan.

#### Configuración de redes sociales (_social_)

Parámetros opcionales relacionados con la compartición de contenidos a través de redes sociales:

* ##### Id de widget para compartir en [AddThis](http://www.addthis.com) (_addThisId_)
Identificador de nuestro widget para compartir configurado en [AddThis](http://www.addthis.com), que nos permitirá integrar su funcionalidad _Inline Share Buttons_ directamente sin necesidad de tocar el código[²](#notas).  
Dicho identificador lo podemos encontrar tras configurar nuestro widget, en la página en la cual nos muestran el código a insertar en nuestra página, similar al siguiente ejemplo en el cual se indica la posición del identificador con la cadena _{id-addThis}_:  

        <!-- Go to www.addthis.com/dashboard to customize your tools -->
        <script type="text/javascript" src="//s7.addthis.com/js/300/addthis_widget.js#pubid={id-addThis}"></script>
Este parámetro es totalmente opcional y en caso de no querer usar [AddThis](http://www.addthis.com), podemos simplemente dejarlo en blanco y en lugar del widget propio del servicio tendremos cuatro botones estándar para compartir en [Facebook](https://www.facebook.com), [Twitter](https://twitter.com), [Google+](https://plus.google.com) y [LinkedIn](https://www.linkedin.com).

* ##### Configuración del parámetro _via_ al compartir en [Twitter](https://twitter.com) (_twitterVia_)
Aquí podemos especificar de manera opcional un nombre de cuenta de [Twitter](https://twitter.com) para que se le referencie por defecto siempre que se comparten contenidos de la web por dicha red social. Si lo dejamos en blanco, simplemente no se empleará el parámetro.

* ##### Configuración del nombre del sitio web al compartir por redes sociales (_ogSiteName_)
Este parámetro nos permitirá definir un nombre para identificar nuestra web al compartir por redes sociales (tag _meta_ «og:site_name»). Podemos dejarlo en blanco y se ignorará dicho parámetro al compartir.

La aplicación incluye una serie de tags por defecto que proporcionan información al compartir por redes sociales que consideramos correcta para cualquier instalación de Emapic que no varíe su comportamiento actual. Dichos tags se pueden encontrar en los archivos [_views/partials/base-header.hjs_](views/partials/base-header.hjs) y [_views/partials/map-header.hjs_](views/partials/map-header.hjs).

## Licencia

El código se publica bajo la licencia GNU AFFERO GPL v3 (véase [LICENSE-AGPLv3.md](LICENSE-AGPLv3.md)).

## Contribuciones

### Reportar errores

Puedes reportar errores u otros problemas que encuentres en la aplicación (tanto en el propio código como en nuestra versión en producción en [emapic.es](https://emapic.es)) a través de [GitHub](https://github.com/Emapic/emapic/issues).

A la hora de reportar un error:

1. Comprueba que no haya sido ya reportado previamente.
2. Intenta que el título sea breve pero descriptivo.
3. Detalla los pasos a seguir para reproducir el error.
4. A ser posible, indica el tipo de dispositivo (móvil, tablet, ordenador de sobremesa...), tu sistema operativo y navegador (y ya para nota, la versión del navegador :wink:).

### Miembros del Equipo

Ante cualquier duda o problema con la aplicación, puedes contactar directamente con nosotros:

* Jorge López Fernández [github](https://github.com/jorgelf)
* Aida Vidal Balea [github](https://github.com/aidav25)
* Adrián Eirís Torres [github](https://github.com/aeiris)
* Alberto Varela García [github](https://github.com/avarela) | [twitter](https://twitter.com/albertouve)

[Twitter de Emapic](https://twitter.com/_emapic) | [info@emapic.es](mailto:info@emapic.es)

---

##### Notas
¹: esperamos añadir más adelante una pequeña guía sobre cómo cambiar el idioma profundizando más en el tema.  
²: si queremos activar esta funcionalidad, es conveniente leer antes los [términos de servicio de AddThis](http://www.addthis.com/privacy/terms-of-service) para asegurarnos de que cumplimos sus requisitos, y su [política de privacidad](http://www.addthis.com/privacy/privacy-policy) para comprender qué datos manejan y con qué fines.
