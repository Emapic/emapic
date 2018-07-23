
![Logo of Emapic](public/images/logo_bluefont.png)

##### [En español](README_es.md)

# Emapic

__Geolocated surveys engine.__

[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.png?v=103)](https://github.com/ellerbrock/open-source-badges/) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](http://www.gnu.org/licenses/agpl-3.0) [![Code Climate](https://codeclimate.com/github/Emapic/emapic/badges/gpa.svg)](https://codeclimate.com/github/Emapic/emapic)

Open source repository with the source code of the geolocated surveys engine Emapic, developed by the laboratory [CartoLAB](http://cartolab.udc.es/cartoweb/) of the [Universidade da Coruña](http://www.udc.es/). Live version at the website [emapic.es](https://emapic.es).

## Current state

Emapic is still in alpha version waiting for more features we consider basic as well as improving some aspects and fixing the bugs it may still have.

Development started in 2014 with a small private prototype, which later evolved to a real web application in 2015.

## Technologies used

Server-side code is based on runtime environment [Node.js](https://nodejs.org/), which uses [JavaScript](https://en.wikipedia.org/wiki/JavaScript) code.

You can check a throrough list of technologies, libraries and other data sources used in [our web](https://emapic.es/know_more/technologies).

## Basic deployment of the application

### Prerequisites

For launching Emapic locally you need before starting:

* [git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) (>=0.10.25 <4.0.0)
* [npm](https://www.npmjs.com/) (usually installed along with Node.js)
* [PostgreSQL](https://www.postgresql.org/) (>=9.2)
* [PostGIS](http://postgis.net/) (>=2.0)

You also need the PostgreSQL module _unaccent_ in order to search through texts with accents and similar signs. This can be easily installed in Debian and derived systems via the __postgresql-contrib__ package.  
We strongly encourage to install it, but in case you consider it's not actually required for any reason (e.g. it's a private installation and the user's main language doesn't use accents), you can prevent its use by removing the SQL commands that create and delete it from files _db/deploy/extensions.sql_ and _db/revert/extensions.sql_, delete its SELECT in _db/verify/extensions.sql_ and remove its reference when creating the text search configuration in _db/deploy/extensions.sql_.

Although it's disabled by default, if we want the server to automatically scan every uploaded file for virus, we must install [ClamAV](https://www.clamav.net/) antivirus. In Debian and derived systems it can be easily installed via the __clamav__ package. We strongly encourage to install its _daemon_ as well, in Debian and derived systems via the __clamav-daemon__ package. Though the application can scan files without the _daemon_, scanning time sees a big increase, going from what's usually not more than a mere hundredths of a second to more than ten seconds, resulting in laggy responses from the server. The application will automatically use the _daemon_ command instead of the manual one when available. Once we have installed the antivirus, we must remember to download the virus database with the command _freshclam_ and to repeat this process periodically in order to keep it updated. If we have any problems after installing these two packges and updating the virus database, we recommend to check [ClamAV installation guide](https://www.clamav.net/documents/installing-clamav).

We also recommend for developers who wish to work with our code:

* [Sqitch](http://sqitch.org/) >= 0.9994  
We think the easiest installation method among the ones listed by Sqitch is "Apt + cpanminus".

### Application setup

First of all we download Emapic's repository with git and browse into its _db_ folder:

```
git clone https://github.com/Emapic/emapic.git
cd emapic/db
```

#### Database

Database can be restored either by executing a custom script or by using Sqitch.
If you don't plan on working with our code or to deploy new updates onto an installed version, we recommend that you use the script because it's way simpler and doesn't require additional tools. In other case, Sqitch is recommended in order to ease the deployment of future database updates.

##### Script

We browse into the _db_ folder in the repository:

```
cd db
```

File _db.sh_ inside that folder is the one used for creating the database. By default it will create a DB named "emapic" and a DB user "emapic" with password "emapic" for accessing it from our application. Lastly, it will insert a test user named "emapic" and with password "emapic" as well for the web application itself. For doing all this, it will access with admin user "postgres", password "postgres" the local PostgreSQL server through default port (5432).  This script requires _sed_ to be installed and accessible for making a few replacements in some files.
If any of these data is not correct, particularly the ones related to the DB server or the admin user, you must edit the file and change them in its first lines. Next:

```
./db.sh
```

DB should be operative once the process has finished.

##### Sqitch

[Sqitch](http://sqitch.org/) is an application used for database model version management, allowing us to easily deploy or revert changes from different versions.  
In order to restore the database with Sqitch, first we enter inside the _db_ folder in the repository:

```
cd db
```

Inside this folder we can find file _sqitch.conf_, which contains the configuration parameters for the database restoration. The fields we should check are:


* 'uri' inside '[target "emapic"]': here we specify the database connection string. By default it will try to connect with user "postgres", password "postgres" the local PostgreSQL server through default port (5432).  
If any of these values is wrong, you must modify the connection string using the following format (replace the text strings surrounded by curly brackets with their respective values):

        db:pg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}

* 'emapic_db_user' inside '[deploy "variables"]', '[verify "variables"]' and '[revert "variables"]': the name of the database user Emapic will use to connect to the database.  
By default, with the value "emapic". If you want to use a different name, you can simply edit this file and change its value, or add the parameter "-s emapic_db_user={emapic_db_user}" to all Sqitch executions, replacing the string surrounded by curly brackets with the desired user name.
* 'emapic_db_user_pass' inside '[deploy "variables"]': the password of the database user Emapic will use to connect to the database.  
By default, with the value "emapic".You should replace it with a more secure password. In order to change it, you can simply edit this file and change its value, or add the parameter "-s emapic_db_user_pass={emapic_db_user_pass}" to the deploy Sqitch execution, replacing the string surrounded by curly brackets with the desired user name.

Once the Sqitch configuration is complete, we execute:

```
sqitch deploy
```

DB should be operative once the process has finished.

This method doesn't add any default user for our application. If we want to do so, we must execute onto our DB the SQL script _emapic\_test\_user.sql_, which will add a test with name "emapic" and password "emapic" for logging into the web application itself.

##### About _sqitch.plan_ changes

Though we try to avoid it, we've had to change some old sqitch commits inside the _sqitch.plan_ file. This causes sqitch to throw an error when trying to deploy new commits into a database that was built with the previous version of those commits. The hash used by sqitch to internally identify these commits is the main cause, as it results into a different value with any change. If this happens to you, there are some strategies for fixing/avoiding the problem:

* The easiest one is obviously to deploy the database again from scratch, probably your best choice if you have no important Emapic data stored or you don't mind doing a backup and restoring it into a new database. Keep in mind you'll lose your old sqitch log.

* You can try to do a sqitch rebase up to the updated commits (this amounts to a revert and a redeploy). Again in this case you'll probably have to backup and restore your data if you don't want to lose it (depends on the commits you have to revert).

* Rename/delete the 'sqitch' schema of your Emapic database, redeploy the database with a different name (or into another database server), backup the sqitch schema of this new database and restore it into the old one. If there are any new commits which weren't applied to your old database, you should apply them manually by executing their deploy sql. This is your best choice if you are an advanced user and can't afford to shutdown the database for a short time or simply don't want to fuss around with big database backups. If you redeploy the database with a different name in the same server, be careful about the Emapic DB user.

#### Server code

Now you must install the required Node.js packages before launching the application. While being in the repository base folder we execute:

```
npm install
```

Now we can launch the application with the command:

```
nodejs server.js
```
Or (depending on your Node.js version):
```
node server.js
```

Right now we should be able to open our application with any browser through the url https://localhost:3000, and log in through the login page (https://localhost:3000/login) with the default user:

__User:__ emapic  
__Password:__ emapic

### Configuration

There is no need to change the default configuration in order to launch the application in localhost, enter with user "emapic" and test the survey engine, but you'll have to if you want to set it in a production server or test functionalities which require external services (SMTP & OAuth).  
File _config.json_ contains most of the configuration parameters for the application:

#### Emapic's configuration parameters (_app_)

Here we have the config parameters that directly affect the Emapic user experience. As of now there are only four:

* ##### Search language (_searchEngineLang_)
Main language for the searches done in our surveys gallery, by default in spanish.  
They will work mostly the same in both spanish and any "similar" language (french, english, portuguese...), thus we don't recommend changing it if you are not familiar with PostgreSQL search engines[¹](#footnotes).

* ##### Default page size (_defaultPageSize_)
The number of surveys to show per page by default in their listings.

* ##### User experience survey frequency (_emapicOpinionFreq_)
Emapic has a user experience survey about the geolocation process which is shown with a configured probability after answering any survey.  
By default it's never shown, and this parameter can have any value between 0 (never show it) and 1 (always show it).

* ##### Survey ID encryption (_surveyIdEncr_)
These are the values used for encrypting the numerical id of each survey and translating it to a text string which is how we will identify it in URLs.  
You should only change it if for any reason you want text strings with other characters or a different length.

* ##### Emapic OAuth (_oauth_)
The configuration parameters for the OAuth2 authentication service provided by Emapic itself. Do not confuse them with the configuration parameters for external OAuth services that is detailed later on. These include a boolean parameter for activating/deactivating the service (_active_) and the lifetimes for the access token and the refresh token (_accessTokenLifetime_ and _refreshTokenLifetime_). Both lifetimes accept null as value, which will translate into the default values provided by the library (1 hour for the access token, 2 weeks for the refresh one).

#### DB connection parameters (_db_)

The parameters for setting our Emapic DB connection: server (_host_), port (_port_), database name (_database_), database user (_user_) and its password (_password_). The file already has the default parameters used in the DB creation script (DB "emapic" in localhost, port 5432, user "emapic" with password "emapic").  
DB connection can be configured with the environment variable _POSTGRESQL_DB_CONN_STRING_ as well, by having it contain a connection string with the following format (replace the text strings starting with "db_" with the right values):

```
postgresql://db_user:db_password@db_host:db_port/db_name
```

For example, with the default values:

```
postgresql://emapic:emapic@localhost:5432/emapic
```

#### Configuration of external services with geographic component (_geoServices_)

Here we have the configuration parameters required for external services with geographic component, mainly used by the viewer:

* ##### [Mapbox](https://www.mapbox.com/) token (_mapboxToken_)
ID token from our [Mapbox](https://www.mapbox.com/) account which will allow us to load the satellite layer they offer.  
If we don't have an account and/or we don't require that layer, we can simply leave this field blank and it will be ignored.

* ##### Contact e-mail for [Nominatim](http://wiki.openstreetmap.org/wiki/Nominatim) (_nominatimEmail_)
E-mail address which will be passed in the requests made to [Nominatim](http://wiki.openstreetmap.org/wiki/Nominatim).  
It can be left blank for testing or controlled environments, but if the application goes public, they advise to specify an e-mail for contacting in case some problem arises or if there happens to be a very high number of requests.

#### External services OAuth (_oAuth_)

In order to log in through Google or Facebook you must change the parameters inside the groups _oAuth.google_ and _oAuth.facebook_ respectively. For doing that, we must have an application registered in the developers section of their websites and set in the config file the __id__ and the __secret__.

#### Server configuration (_server_)

The parameters here included are related to the Node.js server configuration:

* ##### Domain name (_domain_)
Domain name under which we will serve our application. Needed for the OAuth services' callbacks.  
By default with a localhost server value.

* ##### Server IP address (_ipaddr_)
IP address through which the server will serve the website.  
By default with a localhost server value.  
It can also be configured through the environment variable _NODEJS_IP_.

* ##### HTTPS port (_httpsport_)
Port used for listening to HTTPS requests.  
Normally it would be port 443, but by default we set an unreserved port for testing purposes in a localhost server.  
It can also be configured through the environment variable _NODEJS_HTTPS_PORT_.

* ##### HTTP port (_httpport_)
Port used for listening to HTTP requests, which will be redirected to HTTPS in most cases.  
Normally it would be port 80, but by default we set an unreserved port for testing purposes in a localhost server.  
It can also be configured through the environment variable _NODEJS_HTTP_PORT_.

* ##### «robots.txt» file header (_robotsHeader_)
It's simply a text that precedes the body of the "robots.txt" file, which is dynamically generated.
It doesn't have any actual effect onto the application and we can leave its default value or replace it by any introductory text that we want.

* ##### Automatic scanning for virus with ClamAV of every file uploaded to the server (_autoScanFiles_)
Indicates whether the application will scan every uploaded file for virus with ClamAV before actually processing the request. If it finds any suspicious file, request will be terminated and everyfile it uploaded will be deleted.
This comes disabled by default. If we want this scan to be automatically performed, we must first install ClamAV onto the local machine (more information onto this in [the prerequisites section](#prerequisites)) and make sure that commands _clamscan_ and/or _clamdscan_ are executable by the user that will launch the Node.js server application. Once the antivirus is configured, we would set this parameter to "true" in order to activate the scanning.

* ##### Encryption secrets (_secrets_)
The text strings used for encrypting the elements used for keeping and unequivocally communication between Emapic and each web user.  
The default values are perfectly valid, though for production environments we encourage you to set different random strings of at least the same length.

* ##### SSL (_ssl_)
Here we must specify the route (absolute or relative from the base Emapic folder) of the SSL certificate and private key for our website.  
A self-signed certificate is included for testing purposes in a localhost server.

#### SMTP (_smtp_)

The outgoing mail server used for sending mails to users in order to activate their accounts or reset their password in case they forgot it.  
You must check your e-mail account service in order to activate the SMTP support and then set all the required fields.

#### Social networks config (_social_)

Optional parameters related to content sharing through social networks:

* ##### [AddThis](http://www.addthis.com) sharing widget id (_addThisId_)
Id of our configured sharing widget in [AddThis](http://www.addthis.com), which will allow us to include their funcionality _Inline Share Buttons_ without having to edit our code[²](#footnotes).  
That id can be found after configuring our widget, in the page which shows us the code to paste in our page, similar to the following example in which we point the id location with the string _{id-addThis}_:

        <!-- Go to www.addthis.com/dashboard to customize your tools -->
        <script type="text/javascript" src="//s7.addthis.com/js/300/addthis_widget.js#pubid={id-addThis}"></script>
This is a completely optional parameter and if we don't want to use [AddThis](http://www.addthis.com) we can simply leave it empty and instead of their widget we'll have four standard buttons for sharing through [Facebook](https://www.facebook.com), [Twitter](https://twitter.com), [Google+](https://plus.google.com) and [LinkedIn](https://www.linkedin.com).

* ##### Configuration of [Twitter](https://twitter.com)'s _via_ parameter (_twitterVia_)
Here we can specify an optional [Twitter](https://twitter.com) account name in order to link it everytime any content is shared through that social network. If we leave it empty, the parameter will simply be ignored.

* ##### Configuration of the website name when sharing through social networks (_ogSiteName_)
This parameter allows us to define a name for our website when sharing through social networks (tag _meta_ «og:site_name»). We can simply leave it blank in order to ignore it when sharing.

This application includes a list of tags which provide info when sharing through social networks that we consider accurate for any installation of Emapic which doesn't alter its current features. Those tags can be found inside files [_views/partials/base-header.hjs_](views/partials/base-header.hjs) and [_views/partials/map-header.hjs_](views/partials/map-header.hjs).

## License

Code is published under the GNU AFFERO GPL v3 license (see [LICENSE-AGPLv3.md](LICENSE-AGPLv3.md)).

## Contributions

### Reporting issues

You can report bugs or any other issues you find in the application (either in the code itself or in our live version in [emapic.es](https://emapic.es)) through [GitHub](https://github.com/Emapic/emapic/issues).

When reporting an issue:

1. Check it has not been already reported.
2. Try to set a descriptive and brief title.
3. Detail the steps needed to reproduce the problem.
4. If you can, say what type of device (smartphone, tablet, desktop computer...), operating system and browser you used (and if you want to be a pro, the browser version :wink:).

### Team members

If you have any doubt or problem regarding the application, you can contact directly with us:

* Jorge López Fernández [github](https://github.com/jorgelf)
* Aida Vidal Balea [github](https://github.com/aidav25)
* Adrián Eirís Torres [github](https://github.com/aeiris)
* Alberto Varela García [github](https://github.com/avarela) | [twitter](https://twitter.com/albertouve)

[Emapic twitter](https://twitter.com/_emapic) | [info@emapic.es](mailto:info@emapic.es)

---

##### Footnotes
¹: in the future we hope to add a brief guide about how to change the search engine language while also diving a little into this subject.  
²: if we want to activate this feature, we should first read [AddThis' terms of service](http://www.addthis.com/privacy/terms-of-service) in order to make sure we comply with them, and their [privacy policy](http://www.addthis.com/privacy/privacy-policy) so we understand which data they use and with what purposes.
