
![Logo of Emapic](public/images/logo_bluefont.png)

##### [English](README_en.md)

# Emapic

__Motor de encuestas geolocalizadas.__

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
* [Node.js](https://nodejs.org/) (>=0.10.25)
* [npm](https://www.npmjs.com/) (normalmente ya instalado con Node.js)
* [PostgreSQL](https://www.postgresql.org/) (>=9.2)
* [PostGIS](http://postgis.net/) (>=2.0)

Además se necesita el módulo _unaccent_ de PostgreSQL con el fin de poder ejecutar búsquedas sobre textos con tildes y similares. Éste se puede instalar fácilmente en sistemas Debian y derivados mediante el paquete __postgresql-contrib__.  
Recomendamos encarecidamente su instalación, pero en caso de considerar que no necesitas la extensión por algún motivo (e.g. se va a instalar de manera privada y el idioma del usuario no emplea acentos), puedes eliminar su uso borrando los comandos SQL que la crean y la borran en los archivos _db/deploy/extensions.sql_ y _db/revert/extensions.sql_, eliminando su SELECT en _db/verify/extensions.sql_, y quitando su referencia al crear la configuración de búsqueda en _db/deploy/extensions.sql_.

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

El fichero _db.sh_ dentro de esta carpeta es el empleado para construir la BDD. Por defecto creará una BDD de nombre «emapic» y un usuario de BDD «emapic» con contraseña «emapic» para acceder a ella desde la aplicación.  Finalmente introducirá un usuario de prueba también de nombre «emapic» y contraseña «emapic» para acceder a la propia aplicación web. Para ello accederá con el usuario «postgres», contraseña «postgres» al servidor local en el puerto por defecto (5432).  
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


#### Código del servidor

Ahora para poder lanzar la aplicación primero hay que instalar los paquetes requeridos de Node.js. Dentro de la carpeta base del repositorio ejecutamos:

```
npm install
```

La aplicación ya se puede lanzar con el comando:

```
nodejs server.js
```
O (dependiendo de tu versión de Node.js):
```
node server.js
```

Con un navegador deberíamos poder entrar a la web en la URL https://localhost:3000, y entrar a través de la página de login (https://localhost:3000/login) con el usuario por defecto:

__Usuario:__ emapic  
__Contraseña:__ emapic

### Configuración

No es necesario modificar la configuración por defecto para lanzar la aplicación en local, entrar con el usuario «emapic» y probar el motor de encuestas, pero sí lo será si queremos ponerla en producción o probar funcionalidades que requieren servicios externos (SMTP & OAuth).  
El fichero _config.json_ contiene la mayoría de los parámetros de configuración de la aplicación:

#### Configuración propia de Emapic (_app_)

Aquí se incluyen los parámetros de configuración de Emapic que afectan a la experiencia del usuario final. Por ahora sólo hay tres:

* ##### Idioma de búsqueda (_searchEngineLang_)
El idioma que se supone principal para las búsquedas realizadas sobre las encuestas, por defecto en español.  
La inmensa mayoría funcionarán igualmente en español y en idiomas «cercanos» (francés, inglés, portugués...), por lo que no se recomienda cambiarlo si no se tienen conocimientos sobre los motores de búsqueda en PostgreSQL[¹](#markdown-header-notas).

* ##### Frecuencia de la encuesta sobre la experiencia de usuario (_emapicOpinionFreq_)
Emapic incluye una encuesta sobre la experiencia de usuario respecto al proceso de geolocalización que se muestra con cierta probabilidad tras responder a cualquier encuesta.  
Por defecto no se muestra nunca, pudiendo tener este parámetro un valor entre 0 (nunca se muestra) y 1 (se muestra siempre).

* ##### Codificación de id de encuesta (_surveyIdEncr_)
Éstos son los valores empleados para encriptar el identificador numérico de cada encuesta y traducirlo a una cadena de texto que es cómo la identificaremos en la URL.  
Sólo deberías cambiarlo si por algún motivo quieres cadenas de texto con otros caracteres o de diferente longitud.

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

#### OAuth (_oAuth_)

Para autenticarte a través de Google o Facebook es necesario cambiar los parámetros de los grupos _oAuth.google_ y _oAuth.facebook_ respectivamente. Para ello deberemos tener registrada una aplicación en la sección de desarrolladores de sus respectivas webs y poner en el fichero el __id__ y el __secreto__.

#### Configuración interna del servidor (_server_)

Aquí se incluyen los parámetros empleados para configurar el servidor de Node.js:

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
Identificador de nuestro widget para compartir configurado en [AddThis](http://www.addthis.com), que nos permitirá integrar su funcionalidad _Inline Share Buttons_ directamente sin necesidad de tocar el código[²](#markdown-header-notas).  
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
* Adrián Eirís Torres [github](https://github.com/aeiris)
* Alberto Varela García [github](https://github.com/avarela) | [twitter](https://twitter.com/albertouve)

[Twitter de Emapic](https://twitter.com/_emapic) | [info@emapic.es](mailto:info@emapic.es)

---

##### Notas
¹: esperamos añadir más adelante una pequeña guía sobre cómo cambiar el idioma profundizando más en el tema.  
²: si queremos activar esta funcionalidad, es conveniente leer antes los [términos de servicio de AddThis](http://www.addthis.com/privacy/terms-of-service) para asegurarnos de que cumplimos sus requisitos, y su [política de privacidad](http://www.addthis.com/privacy/privacy-policy) para comprender qué datos manejan y con qué fines.
