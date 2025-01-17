-- Deploy emapic:country_names_gl to pg
-- requires: base_layers

BEGIN;

	ALTER TABLE base_layers.countries ADD COLUMN name_gl VARCHAR(254);

	UPDATE base_layers.countries SET name_gl='Andorra' WHERE gid = 7;
	UPDATE base_layers.countries SET name_gl='Emiratos Árabes Unidos' WHERE gid = 8;
	UPDATE base_layers.countries SET name_gl='Afganistán' WHERE gid = 2;
	UPDATE base_layers.countries SET name_gl='Antiga e Barbuda' WHERE gid = 15;
	UPDATE base_layers.countries SET name_gl='Anguila' WHERE gid = 4;
	UPDATE base_layers.countries SET name_gl='Albania' WHERE gid = 5;
	UPDATE base_layers.countries SET name_gl='Armenia' WHERE gid = 10;
	UPDATE base_layers.countries SET name_gl='Angola' WHERE gid = 3;
	UPDATE base_layers.countries SET name_gl='Antártida' WHERE gid = 12;
	UPDATE base_layers.countries SET name_gl='Arxentina' WHERE gid = 9;
	UPDATE base_layers.countries SET name_gl='Samoa Americana' WHERE gid = 11;
	UPDATE base_layers.countries SET name_gl='Austria' WHERE gid = 17;
	UPDATE base_layers.countries SET name_gl='Australia' WHERE gid = 16;
	UPDATE base_layers.countries SET name_gl='Aruba' WHERE gid = 1;
	UPDATE base_layers.countries SET name_gl='Åland' WHERE gid = 6;
	UPDATE base_layers.countries SET name_gl='Acerbaixán' WHERE gid = 18;
	UPDATE base_layers.countries SET name_gl='Bosnia e Hercegovina' WHERE gid = 27;
	UPDATE base_layers.countries SET name_gl='Barbados' WHERE gid = 34;
	UPDATE base_layers.countries SET name_gl='Bangladesh' WHERE gid = 23;
	UPDATE base_layers.countries SET name_gl='Bélxica' WHERE gid = 20;
	UPDATE base_layers.countries SET name_gl='Burkina Faso' WHERE gid = 22;
	UPDATE base_layers.countries SET name_gl='Bulgaria' WHERE gid = 24;
	UPDATE base_layers.countries SET name_gl='Bahrain' WHERE gid = 25;
	UPDATE base_layers.countries SET name_gl='Burundi' WHERE gid = 19;
	UPDATE base_layers.countries SET name_gl='Benín' WHERE gid = 21;
	UPDATE base_layers.countries SET name_gl='San Bartolomé' WHERE gid = 28;
	UPDATE base_layers.countries SET name_gl='Bermudas' WHERE gid = 31;
	UPDATE base_layers.countries SET name_gl='Brunei' WHERE gid = 35;
	UPDATE base_layers.countries SET name_gl='Bolivia' WHERE gid = 32;
	UPDATE base_layers.countries SET name_gl='Brasil' WHERE gid = 33;
	UPDATE base_layers.countries SET name_gl='Bahamas' WHERE gid = 26;
	UPDATE base_layers.countries SET name_gl='Bután' WHERE gid = 36;
	UPDATE base_layers.countries SET name_gl='Botsuana' WHERE gid = 37;
	UPDATE base_layers.countries SET name_gl='Bielorrusia' WHERE gid = 29;
	UPDATE base_layers.countries SET name_gl='Belize' WHERE gid = 30;
	UPDATE base_layers.countries SET name_gl='Canadá' WHERE gid = 39;
	UPDATE base_layers.countries SET name_gl='República Democrática do Congo' WHERE gid = 45;
	UPDATE base_layers.countries SET name_gl='República Centroafricana' WHERE gid = 38;
	UPDATE base_layers.countries SET name_gl='Congo' WHERE gid = 46;
	UPDATE base_layers.countries SET name_gl='Suíza' WHERE gid = 40;
	UPDATE base_layers.countries SET name_gl='Costa do Marfil' WHERE gid = 43;
	UPDATE base_layers.countries SET name_gl='Illas Cook' WHERE gid = 47;
	UPDATE base_layers.countries SET name_gl='Chile' WHERE gid = 41;
	UPDATE base_layers.countries SET name_gl='Camerún' WHERE gid = 44;
	UPDATE base_layers.countries SET name_gl='China' WHERE gid = 42;
	UPDATE base_layers.countries SET name_gl='Colombia' WHERE gid = 48;
	UPDATE base_layers.countries SET name_gl='Costa Rica' WHERE gid = 51;
	UPDATE base_layers.countries SET name_gl='Cuba' WHERE gid = 52;
	UPDATE base_layers.countries SET name_gl='Cabo Verde' WHERE gid = 50;
	UPDATE base_layers.countries SET name_gl='Curazao' WHERE gid = 53;
	UPDATE base_layers.countries SET name_gl='Chipre' WHERE gid = 56;
	UPDATE base_layers.countries SET name_gl='República Checa' WHERE gid = 57;
	UPDATE base_layers.countries SET name_gl='Alemaña' WHERE gid = 58;
	UPDATE base_layers.countries SET name_gl='Xibutí' WHERE gid = 59;
	UPDATE base_layers.countries SET name_gl='Dinamarca' WHERE gid = 61;
	UPDATE base_layers.countries SET name_gl='Dominica' WHERE gid = 60;
	UPDATE base_layers.countries SET name_gl='República Dominicana' WHERE gid = 62;
	UPDATE base_layers.countries SET name_gl='Alxeria' WHERE gid = 63;
	UPDATE base_layers.countries SET name_gl='Ecuador' WHERE gid = 64;
	UPDATE base_layers.countries SET name_gl='Estonia' WHERE gid = 68;
	UPDATE base_layers.countries SET name_gl='Exipto' WHERE gid = 65;
	UPDATE base_layers.countries SET name_gl='Sáhara Occidental' WHERE gid = 186;
	UPDATE base_layers.countries SET name_gl='Eritrea' WHERE gid = 66;
	UPDATE base_layers.countries SET name_gl='España' WHERE gid = 67;
	UPDATE base_layers.countries SET name_gl='Etiopía' WHERE gid = 69;
	UPDATE base_layers.countries SET name_gl='Finlandia' WHERE gid = 70;
	UPDATE base_layers.countries SET name_gl='Fidxi' WHERE gid = 71;
	UPDATE base_layers.countries SET name_gl='Illas Malvinas' WHERE gid = 72;
	UPDATE base_layers.countries SET name_gl='Micronesia' WHERE gid = 75;
	UPDATE base_layers.countries SET name_gl='Illas Feroe' WHERE gid = 74;
	UPDATE base_layers.countries SET name_gl='Francia' WHERE gid = 73;
	UPDATE base_layers.countries SET name_gl='Gabón' WHERE gid = 76;
	UPDATE base_layers.countries SET name_gl='Reino Unido' WHERE gid = 77;
	UPDATE base_layers.countries SET name_gl='Granada' WHERE gid = 86;
	UPDATE base_layers.countries SET name_gl='Xeorxia' WHERE gid = 78;
	UPDATE base_layers.countries SET name_gl='Guernsey' WHERE gid = 79;
	UPDATE base_layers.countries SET name_gl='Ghana' WHERE gid = 80;
	UPDATE base_layers.countries SET name_gl='Groenlandia' WHERE gid = 87;
	UPDATE base_layers.countries SET name_gl='Gambia' WHERE gid = 82;
	UPDATE base_layers.countries SET name_gl='Guinea' WHERE gid = 81;
	UPDATE base_layers.countries SET name_gl='Guinea Ecuatorial' WHERE gid = 84;
	UPDATE base_layers.countries SET name_gl='Grecia' WHERE gid = 85;
	UPDATE base_layers.countries SET name_gl='Illas Xeorxia do Sur e Sandwich do Sur' WHERE gid = 192;
	UPDATE base_layers.countries SET name_gl='Guatemala' WHERE gid = 88;
	UPDATE base_layers.countries SET name_gl='Guam' WHERE gid = 89;
	UPDATE base_layers.countries SET name_gl='Guinea-Bisau' WHERE gid = 83;
	UPDATE base_layers.countries SET name_gl='Güiana' WHERE gid = 90;
	UPDATE base_layers.countries SET name_gl='Hong Kong' WHERE gid = 91;
	UPDATE base_layers.countries SET name_gl='Illas Heard e McDonald' WHERE gid = 92;
	UPDATE base_layers.countries SET name_gl='Honduras' WHERE gid = 93;
	UPDATE base_layers.countries SET name_gl='Croacia' WHERE gid = 94;
	UPDATE base_layers.countries SET name_gl='Haití' WHERE gid = 95;
	UPDATE base_layers.countries SET name_gl='Hungría' WHERE gid = 96;
	UPDATE base_layers.countries SET name_gl='Indonesia' WHERE gid = 97;
	UPDATE base_layers.countries SET name_gl='Irlanda' WHERE gid = 102;
	UPDATE base_layers.countries SET name_gl='Israel' WHERE gid = 106;
	UPDATE base_layers.countries SET name_gl='Illa de Man' WHERE gid = 98;
	UPDATE base_layers.countries SET name_gl='India' WHERE gid = 99;
	UPDATE base_layers.countries SET name_gl='Territorio Británico do Océano Índico' WHERE gid = 101;
	UPDATE base_layers.countries SET name_gl='Iraq' WHERE gid = 104;
	UPDATE base_layers.countries SET name_gl='Irán' WHERE gid = 103;
	UPDATE base_layers.countries SET name_gl='Islandia' WHERE gid = 105;
	UPDATE base_layers.countries SET name_gl='Italia' WHERE gid = 107;
	UPDATE base_layers.countries SET name_gl='Jersey' WHERE gid = 109;
	UPDATE base_layers.countries SET name_gl='Xamaica' WHERE gid = 108;
	UPDATE base_layers.countries SET name_gl='Xordania' WHERE gid = 110;
	UPDATE base_layers.countries SET name_gl='Xapón' WHERE gid = 111;
	UPDATE base_layers.countries SET name_gl='Quenia' WHERE gid = 114;
	UPDATE base_layers.countries SET name_gl='Kirguizistán' WHERE gid = 115;
	UPDATE base_layers.countries SET name_gl='Camboxa' WHERE gid = 116;
	UPDATE base_layers.countries SET name_gl='Kiribati' WHERE gid = 117;
	UPDATE base_layers.countries SET name_gl='Comores' WHERE gid = 49;
	UPDATE base_layers.countries SET name_gl='San Cristovo e Neves' WHERE gid = 118;
	UPDATE base_layers.countries SET name_gl='República Popular Democrática de Corea' WHERE gid = 177;
	UPDATE base_layers.countries SET name_gl='República de Corea' WHERE gid = 119;
	UPDATE base_layers.countries SET name_gl='Kuwait' WHERE gid = 121;
	UPDATE base_layers.countries SET name_gl='Illas Caimán' WHERE gid = 54;
	UPDATE base_layers.countries SET name_gl='Casaquistán' WHERE gid = 113;
	UPDATE base_layers.countries SET name_gl='República Democrática Popular Lao' WHERE gid = 122;
	UPDATE base_layers.countries SET name_gl='Líbano' WHERE gid = 123;
	UPDATE base_layers.countries SET name_gl='Santa Lucía' WHERE gid = 126;
	UPDATE base_layers.countries SET name_gl='Liechtenstein' WHERE gid = 127;
	UPDATE base_layers.countries SET name_gl='Sri Lanka' WHERE gid = 128;
	UPDATE base_layers.countries SET name_gl='Liberia' WHERE gid = 124;
	UPDATE base_layers.countries SET name_gl='Lesoto' WHERE gid = 129;
	UPDATE base_layers.countries SET name_gl='Lituania' WHERE gid = 130;
	UPDATE base_layers.countries SET name_gl='Luxemburgo' WHERE gid = 131;
	UPDATE base_layers.countries SET name_gl='Letonia' WHERE gid = 132;
	UPDATE base_layers.countries SET name_gl='Libia' WHERE gid = 125;
	UPDATE base_layers.countries SET name_gl='Marrocos' WHERE gid = 135;
	UPDATE base_layers.countries SET name_gl='Mónaco' WHERE gid = 136;
	UPDATE base_layers.countries SET name_gl='Moldavia' WHERE gid = 137;
	UPDATE base_layers.countries SET name_gl='Montenegro' WHERE gid = 146;
	UPDATE base_layers.countries SET name_gl='San Martín' WHERE gid = 134;
	UPDATE base_layers.countries SET name_gl='Madagascar' WHERE gid = 138;
	UPDATE base_layers.countries SET name_gl='Illas Marshall' WHERE gid = 141;
	UPDATE base_layers.countries SET name_gl='Macedonia' WHERE gid = 142;
	UPDATE base_layers.countries SET name_gl='Malí' WHERE gid = 143;
	UPDATE base_layers.countries SET name_gl='Myanmar' WHERE gid = 145;
	UPDATE base_layers.countries SET name_gl='Mongolia' WHERE gid = 147;
	UPDATE base_layers.countries SET name_gl='Macau' WHERE gid = 133;
	UPDATE base_layers.countries SET name_gl='Illas Marianas do Norte' WHERE gid = 148;
	UPDATE base_layers.countries SET name_gl='Mauritania' WHERE gid = 150;
	UPDATE base_layers.countries SET name_gl='Montserrat' WHERE gid = 151;
	UPDATE base_layers.countries SET name_gl='Malta' WHERE gid = 144;
	UPDATE base_layers.countries SET name_gl='Mauricio' WHERE gid = 152;
	UPDATE base_layers.countries SET name_gl='Maldivas' WHERE gid = 139;
	UPDATE base_layers.countries SET name_gl='Malaui' WHERE gid = 153;
	UPDATE base_layers.countries SET name_gl='México' WHERE gid = 140;
	UPDATE base_layers.countries SET name_gl='Malasia' WHERE gid = 154;
	UPDATE base_layers.countries SET name_gl='Mozambique' WHERE gid = 149;
	UPDATE base_layers.countries SET name_gl='Namibia' WHERE gid = 155;
	UPDATE base_layers.countries SET name_gl='Nova Caledonia' WHERE gid = 156;
	UPDATE base_layers.countries SET name_gl='Níxer' WHERE gid = 157;
	UPDATE base_layers.countries SET name_gl='Illa Norfolk' WHERE gid = 158;
	UPDATE base_layers.countries SET name_gl='Nixeria' WHERE gid = 159;
	UPDATE base_layers.countries SET name_gl='Nicaragua' WHERE gid = 160;
	UPDATE base_layers.countries SET name_gl='Países Baixos' WHERE gid = 162;
	UPDATE base_layers.countries SET name_gl='Noruega' WHERE gid = 163;
	UPDATE base_layers.countries SET name_gl='Nepal' WHERE gid = 164;
	UPDATE base_layers.countries SET name_gl='Nauru' WHERE gid = 165;
	UPDATE base_layers.countries SET name_gl='Niue' WHERE gid = 161;
	UPDATE base_layers.countries SET name_es='Nueva Zelanda', name_gl='Nova Zelandia' WHERE gid = 166;
	UPDATE base_layers.countries SET name_gl='Omán' WHERE gid = 167;
	UPDATE base_layers.countries SET name_gl='Panamá' WHERE gid = 169;
	UPDATE base_layers.countries SET name_gl='Perú' WHERE gid = 171;
	UPDATE base_layers.countries SET name_gl='Polinesia Francesa' WHERE gid = 181;
	UPDATE base_layers.countries SET name_gl='Papúa Nova Guinea' WHERE gid = 174;
	UPDATE base_layers.countries SET name_gl='Filipinas' WHERE gid = 172;
	UPDATE base_layers.countries SET name_gl='Paquistán' WHERE gid = 168;
	UPDATE base_layers.countries SET name_gl='Polonia' WHERE gid = 175;
	UPDATE base_layers.countries SET name_gl='San Pedro e Miquelón' WHERE gid = 200;
	UPDATE base_layers.countries SET name_gl='Illas Pitcairn' WHERE gid = 170;
	UPDATE base_layers.countries SET name_gl='Porto Rico' WHERE gid = 176;
	UPDATE base_layers.countries SET name_gl='Palestina' WHERE gid = 180;
	UPDATE base_layers.countries SET name_gl='Portugal' WHERE gid = 178;
	UPDATE base_layers.countries SET name_gl='Palau' WHERE gid = 173;
	UPDATE base_layers.countries SET name_gl='Paraguay' WHERE gid = 179;
	UPDATE base_layers.countries SET name_gl='Qatar' WHERE gid = 182;
	UPDATE base_layers.countries SET name_gl='Romanía' WHERE gid = 183;
	UPDATE base_layers.countries SET name_gl='Serbia' WHERE gid = 201;
	UPDATE base_layers.countries SET name_gl='Rusia' WHERE gid = 184;
	UPDATE base_layers.countries SET name_gl='Ruanda' WHERE gid = 185;
	UPDATE base_layers.countries SET name_gl='Arabia Saudita' WHERE gid = 187;
	UPDATE base_layers.countries SET name_gl='Illas Salomón' WHERE gid = 194;
	UPDATE base_layers.countries SET name_gl='Seixeles' WHERE gid = 209;
	UPDATE base_layers.countries SET name_gl='Sudán' WHERE gid = 188;
	UPDATE base_layers.countries SET name_gl='Suecia' WHERE gid = 206;
	UPDATE base_layers.countries SET name_gl='Singapur' WHERE gid = 191;
	UPDATE base_layers.countries SET name_gl='Santa Helena' WHERE gid = 193;
	UPDATE base_layers.countries SET name_gl='Eslovenia' WHERE gid = 205;
	UPDATE base_layers.countries SET name_gl='Eslovaquia' WHERE gid = 204;
	UPDATE base_layers.countries SET name_gl='Serra Leoa' WHERE gid = 195;
	UPDATE base_layers.countries SET name_gl='San Marino' WHERE gid = 197;
	UPDATE base_layers.countries SET name_gl='Senegal' WHERE gid = 190;
	UPDATE base_layers.countries SET name_gl='Somalia' WHERE gid = 199;
	UPDATE base_layers.countries SET name_gl='Suriname' WHERE gid = 203;
	UPDATE base_layers.countries SET name_gl='Sudán do Sur' WHERE gid = 189;
	UPDATE base_layers.countries SET name_gl='Santo Tomé e Príncipe' WHERE gid = 202;
	UPDATE base_layers.countries SET name_gl='O Salvador' WHERE gid = 196;
	UPDATE base_layers.countries SET name_gl='Sint Maarten' WHERE gid = 208;
	UPDATE base_layers.countries SET name_gl='Siria' WHERE gid = 210;
	UPDATE base_layers.countries SET name_gl='Suacilandia' WHERE gid = 207;
	UPDATE base_layers.countries SET name_gl='Illas Turcas e Caicos' WHERE gid = 211;
	UPDATE base_layers.countries SET name_gl='Chad' WHERE gid = 212;
	UPDATE base_layers.countries SET name_gl='Terras Austrais Francesas' WHERE gid = 14;
	UPDATE base_layers.countries SET name_gl='Togo' WHERE gid = 213;
	UPDATE base_layers.countries SET name_gl='Tailandia' WHERE gid = 214;
	UPDATE base_layers.countries SET name_gl='Taxiquistán' WHERE gid = 215;
	UPDATE base_layers.countries SET name_gl='Timor Leste' WHERE gid = 217;
	UPDATE base_layers.countries SET name_gl='Turcomenistán' WHERE gid = 216;
	UPDATE base_layers.countries SET name_gl='Tunisia' WHERE gid = 220;
	UPDATE base_layers.countries SET name_gl='Tonga' WHERE gid = 218;
	UPDATE base_layers.countries SET name_gl='Turquía' WHERE gid = 221;
	UPDATE base_layers.countries SET name_gl='Trinidad e Tobago' WHERE gid = 219;
	UPDATE base_layers.countries SET name_gl='Taiwán' WHERE gid = 222;
	UPDATE base_layers.countries SET name_gl='Tanzania' WHERE gid = 223;
	UPDATE base_layers.countries SET name_gl='Ucraína' WHERE gid = 225;
	UPDATE base_layers.countries SET name_gl='Uganda' WHERE gid = 224;
	UPDATE base_layers.countries SET name_gl='Estados Unidos' WHERE gid = 227;
	UPDATE base_layers.countries SET name_gl='Uruguai' WHERE gid = 226;
	UPDATE base_layers.countries SET name_gl='Uzbequistán' WHERE gid = 228;
	UPDATE base_layers.countries SET name_gl='Vaticano' WHERE gid = 229;
	UPDATE base_layers.countries SET name_gl='San Vicente e as Granadinas' WHERE gid = 230;
	UPDATE base_layers.countries SET name_gl='Venezuela' WHERE gid = 231;
	UPDATE base_layers.countries SET name_gl='Illas Virxes Británicas' WHERE gid = 232;
	UPDATE base_layers.countries SET name_gl='Illas Virxes dos EE.UU.' WHERE gid = 233;
	UPDATE base_layers.countries SET name_gl='Vietnam' WHERE gid = 234;
	UPDATE base_layers.countries SET name_gl='Vanuatu' WHERE gid = 235;
	UPDATE base_layers.countries SET name_gl='Wallis e Futuna' WHERE gid = 236;
	UPDATE base_layers.countries SET name_gl='Samoa' WHERE gid = 237;
	UPDATE base_layers.countries SET name_gl='Iemen' WHERE gid = 238;
	UPDATE base_layers.countries SET name_gl='Suráfrica' WHERE gid = 239;
	UPDATE base_layers.countries SET name_gl='Zambia' WHERE gid = 240;
	UPDATE base_layers.countries SET name_gl='Cimbabue' WHERE gid = 241;
	UPDATE base_layers.countries SET name_gl='Illas Ashmore e Cartier' WHERE gid = 13;
	UPDATE base_layers.countries SET name_gl='Norte de Chipre' WHERE gid = 55;
	UPDATE base_layers.countries SET name_gl='Glaciar Siachen' WHERE gid = 112;
	UPDATE base_layers.countries SET name_gl='Territorios Océano Índico' WHERE gid = 100;
	UPDATE base_layers.countries SET name_gl='Kosovo' WHERE gid = 120;

COMMIT;
