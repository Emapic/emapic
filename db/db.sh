ADMIN_USER=postgres
ADMIN_PASSWORD=postgres
SERVER=127.0.0.1
PORT=5432
DATABASE=emapic
EMAPIC_USER=emapic
EMAPIC_PASSWORD=emapic

export PGPASSWORD=$ADMIN_PASSWORD

dropdb -h $SERVER -p $PORT -U $ADMIN_USER $DATABASE
createdb -h $SERVER -p $PORT -U $ADMIN_USER $DATABASE

echo "1- Loading Postgres extensions..."
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/extensions.sql 1> /dev/null

echo "2- Loading base layers..."
echo "   This may take up to a few minutes, so you may have time for a quick and relaxing cup of café con leche."
echo
echo "                           ("
echo "                             )     ("
echo "                      ___...(-------)-....___"
echo "                  .-\"\"       )    (          \"\"-."
echo "            .-'\`\`'|-._             )         _.-|"
echo "           /  .--.|   \`\"\"---...........---\"\"\`   |"
echo "          /  /    |                             |"
echo "          |  |    |                             |"
echo "           \\  \\   |                             |"
echo "            \`\\ \`\\ |                             |"
echo "              \`\\ \`|                             |"
echo "              _/ /;                             ;"
echo "             (__/  \\                           /"
echo "          _..---\"\"\"´\                         /\`\"\"---.._"
echo "       .-'           \                       /          '-."
echo "      :               \`-.__             __.-'              :"
echo "      :                  ) \"\"---...---\"\" (                 :"
echo "       '._               \`\"--...___...--\"\`              _.'"
echo "     jgs \\\"\"--..__                              __..--\"\"/"
echo "          '._     \"\"\"----.....______.....----\"\"\"     _.'"
echo "             \`\"\"--..,,_____            _____,,..--\"\"\`"
echo "                           \`\"\"\"----\"\"\"\`"
echo
echo "   ASCII art from http://ascii.co.uk"
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/base_layers.sql 1> /dev/null

echo "3- Creating emapic tables..."
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/emapic_tables.sql 1> /dev/null

echo "4- Creating and configuring emapic user..."
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -c "CREATE USER $EMAPIC_USER WITH PASSWORD '$EMAPIC_PASSWORD';" 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -c "GRANT USAGE ON SCHEMA base_layers TO $EMAPIC_USER;" 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -c "GRANT SELECT ON ALL TABLES IN SCHEMA base_layers TO $EMAPIC_USER;" 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -c "GRANT ALL ON SCHEMA opinions TO $EMAPIC_USER;" 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -c "GRANT USAGE ON SCHEMA public TO $EMAPIC_USER;" 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $EMAPIC_USER;" 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -c "GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA public TO $EMAPIC_USER;" 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -c "GRANT USAGE ON SCHEMA metadata TO $EMAPIC_USER;" 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA metadata TO $EMAPIC_USER;" 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -c "GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA metadata TO $EMAPIC_USER;" 1> /dev/null

echo "5- Updating database with various fixes & improvements..."
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/country_names_es.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/update_province_names.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/update_municipalities_geoms.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/add_simplified_geoms.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/add_image_url_question.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/ignore_null_provinces.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/ceuta_melilla_spain.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/country_names_gl.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/province_names_gl.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/fix_roles_relationship.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/add_postgres_search_function.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/fix_vatican_city_geoms.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/fix_vatican_city_hierarchy.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/fix_municipalities_simpl_geoms.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/fix_vigo_municipality_geoms.sql 1> /dev/null
sed 's/:"emapic_db_user"/emapic/g' deploy/oauth2_tables.sql | psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/add_accept_info_email.sql 1> /dev/null
sed 's/:"emapic_db_user"/emapic/g' deploy/create_files_table.sql | psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/add_image_upload_question.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/files_table_add_time.sql 1> /dev/null
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f ./deploy/add_honduras_provinces_isocodes.sql 1> /dev/null

echo "6- Creating test user..."
psql -h $SERVER -p $PORT -U $ADMIN_USER -d $DATABASE -f emapic_test_user.sql 1> /dev/null

echo "-- Emapic database ready! :-)"
echo "   You can now access your local Emapic with user 'emapic' and password 'emapic'."
echo "   Please keep in mind that it has a fake e-mail, so if you want to use any e-mail related functionality you must modify its value directly in database or create a proper user through the Emapic registration process."
