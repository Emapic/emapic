-- Revert emapic:country_names_es from pg

BEGIN;

	ALTER TABLE base_layers.countries DROP COLUMN name_es;

	UPDATE base_layers.countries SET name='Andorra' WHERE gid = 7;
	UPDATE base_layers.countries SET name='United Arab Emirates' WHERE gid = 8;
	UPDATE base_layers.countries SET name='Afghanistan' WHERE gid = 2;
	UPDATE base_layers.countries SET name='Antigua and Barbuda' WHERE gid = 15;
	UPDATE base_layers.countries SET name='Anguilla' WHERE gid = 4;
	UPDATE base_layers.countries SET name='Albania' WHERE gid = 5;
	UPDATE base_layers.countries SET name='Armenia' WHERE gid = 10;
	UPDATE base_layers.countries SET name='Angola' WHERE gid = 3;
	UPDATE base_layers.countries SET name='Antarctica' WHERE gid = 12;
	UPDATE base_layers.countries SET name='Argentina' WHERE gid = 9;
	UPDATE base_layers.countries SET name='American Samoa' WHERE gid = 11;
	UPDATE base_layers.countries SET name='Austria' WHERE gid = 17;
	UPDATE base_layers.countries SET name='Australia' WHERE gid = 16;
	UPDATE base_layers.countries SET name='Aruba' WHERE gid = 1;
	UPDATE base_layers.countries SET name='Aland' WHERE gid = 6;
	UPDATE base_layers.countries SET name='Azerbaijan' WHERE gid = 18;
	UPDATE base_layers.countries SET name='Bosnia and Herz.' WHERE gid = 27;
	UPDATE base_layers.countries SET name='Barbados' WHERE gid = 34;
	UPDATE base_layers.countries SET name='Bangladesh' WHERE gid = 23;
	UPDATE base_layers.countries SET name='Belgium' WHERE gid = 20;
	UPDATE base_layers.countries SET name='Burkina Faso' WHERE gid = 22;
	UPDATE base_layers.countries SET name='Bulgaria' WHERE gid = 24;
	UPDATE base_layers.countries SET name='Bahrain' WHERE gid = 25;
	UPDATE base_layers.countries SET name='Burundi' WHERE gid = 19;
	UPDATE base_layers.countries SET name='Benin' WHERE gid = 21;
	UPDATE base_layers.countries SET name='St-Barthélemy' WHERE gid = 28;
	UPDATE base_layers.countries SET name='Bermuda' WHERE gid = 31;
	UPDATE base_layers.countries SET name='Brunei' WHERE gid = 35;
	UPDATE base_layers.countries SET name='Bolivia' WHERE gid = 32;
	UPDATE base_layers.countries SET name='Brazil' WHERE gid = 33;
	UPDATE base_layers.countries SET name='Bahamas' WHERE gid = 26;
	UPDATE base_layers.countries SET name='Bhutan' WHERE gid = 36;
	UPDATE base_layers.countries SET name='Botswana' WHERE gid = 37;
	UPDATE base_layers.countries SET name='Belarus' WHERE gid = 29;
	UPDATE base_layers.countries SET name='Belize' WHERE gid = 30;
	UPDATE base_layers.countries SET name='Canada' WHERE gid = 39;
	UPDATE base_layers.countries SET name='Dem. Rep. Congo' WHERE gid = 45;
	UPDATE base_layers.countries SET name='Central African Rep.' WHERE gid = 38;
	UPDATE base_layers.countries SET name='Congo' WHERE gid = 46;
	UPDATE base_layers.countries SET name='Switzerland' WHERE gid = 40;
	UPDATE base_layers.countries SET name='Côte d''Ivoire' WHERE gid = 43;
	UPDATE base_layers.countries SET name='Cook Islands' WHERE gid = 47;
	UPDATE base_layers.countries SET name='Chile' WHERE gid = 41;
	UPDATE base_layers.countries SET name='Cameroon' WHERE gid = 44;
	UPDATE base_layers.countries SET name='China' WHERE gid = 42;
	UPDATE base_layers.countries SET name='Colombia' WHERE gid = 48;
	UPDATE base_layers.countries SET name='Costa Rica' WHERE gid = 51;
	UPDATE base_layers.countries SET name='Cuba' WHERE gid = 52;
	UPDATE base_layers.countries SET name='Cape Verde' WHERE gid = 50;
	UPDATE base_layers.countries SET name='Curaçao' WHERE gid = 53;
	UPDATE base_layers.countries SET name='Cyprus' WHERE gid = 56;
	UPDATE base_layers.countries SET name='Czech Rep.' WHERE gid = 57;
	UPDATE base_layers.countries SET name='Germany' WHERE gid = 58;
	UPDATE base_layers.countries SET name='Djibouti' WHERE gid = 59;
	UPDATE base_layers.countries SET name='Denmark' WHERE gid = 61;
	UPDATE base_layers.countries SET name='Dominica' WHERE gid = 60;
	UPDATE base_layers.countries SET name='Dominican Rep.' WHERE gid = 62;
	UPDATE base_layers.countries SET name='Algeria' WHERE gid = 63;
	UPDATE base_layers.countries SET name='Ecuador' WHERE gid = 64;
	UPDATE base_layers.countries SET name='Estonia' WHERE gid = 68;
	UPDATE base_layers.countries SET name='Egypt' WHERE gid = 65;
	UPDATE base_layers.countries SET name='W. Sahara' WHERE gid = 186;
	UPDATE base_layers.countries SET name='Eritrea' WHERE gid = 66;
	UPDATE base_layers.countries SET name='Spain' WHERE gid = 67;
	UPDATE base_layers.countries SET name='Ethiopia' WHERE gid = 69;
	UPDATE base_layers.countries SET name='Finland' WHERE gid = 70;
	UPDATE base_layers.countries SET name='Fiji' WHERE gid = 71;
	UPDATE base_layers.countries SET name='Falkland Is.' WHERE gid = 72;
	UPDATE base_layers.countries SET name='Micronesia' WHERE gid = 75;
	UPDATE base_layers.countries SET name='Faeroe Is.' WHERE gid = 74;
	UPDATE base_layers.countries SET name='France' WHERE gid = 73;
	UPDATE base_layers.countries SET name='Gabon' WHERE gid = 76;
	UPDATE base_layers.countries SET name='United Kingdom' WHERE gid = 77;
	UPDATE base_layers.countries SET name='Grenada' WHERE gid = 86;
	UPDATE base_layers.countries SET name='Georgia' WHERE gid = 78;
	UPDATE base_layers.countries SET name='Guernsey' WHERE gid = 79;
	UPDATE base_layers.countries SET name='Ghana' WHERE gid = 80;
	UPDATE base_layers.countries SET name='Greenland' WHERE gid = 87;
	UPDATE base_layers.countries SET name='Gambia' WHERE gid = 82;
	UPDATE base_layers.countries SET name='Guinea' WHERE gid = 81;
	UPDATE base_layers.countries SET name='Equatorial Guinea' WHERE gid = 84;
	UPDATE base_layers.countries SET name='Greece' WHERE gid = 85;
	UPDATE base_layers.countries SET name='S. Geo. and S. Sandw. Is.' WHERE gid = 192;
	UPDATE base_layers.countries SET name='Guatemala' WHERE gid = 88;
	UPDATE base_layers.countries SET name='Guam' WHERE gid = 89;
	UPDATE base_layers.countries SET name='Guinea-Bissau' WHERE gid = 83;
	UPDATE base_layers.countries SET name='Guyana' WHERE gid = 90;
	UPDATE base_layers.countries SET name='Hong Kong' WHERE gid = 91;
	UPDATE base_layers.countries SET name='Heard I. and McDonald Is.' WHERE gid = 92;
	UPDATE base_layers.countries SET name='Honduras' WHERE gid = 93;
	UPDATE base_layers.countries SET name='Croatia' WHERE gid = 94;
	UPDATE base_layers.countries SET name='Haiti' WHERE gid = 95;
	UPDATE base_layers.countries SET name='Hungary' WHERE gid = 96;
	UPDATE base_layers.countries SET name='Indonesia' WHERE gid = 97;
	UPDATE base_layers.countries SET name='Ireland' WHERE gid = 102;
	UPDATE base_layers.countries SET name='Israel' WHERE gid = 106;
	UPDATE base_layers.countries SET name='Isle of Man' WHERE gid = 98;
	UPDATE base_layers.countries SET name='India' WHERE gid = 99;
	UPDATE base_layers.countries SET name='Br. Indian Ocean Ter.' WHERE gid = 101;
	UPDATE base_layers.countries SET name='Iraq' WHERE gid = 104;
	UPDATE base_layers.countries SET name='Iran' WHERE gid = 103;
	UPDATE base_layers.countries SET name='Iceland' WHERE gid = 105;
	UPDATE base_layers.countries SET name='Italy' WHERE gid = 107;
	UPDATE base_layers.countries SET name='Jersey' WHERE gid = 109;
	UPDATE base_layers.countries SET name='Jamaica' WHERE gid = 108;
	UPDATE base_layers.countries SET name='Jordan' WHERE gid = 110;
	UPDATE base_layers.countries SET name='Japan' WHERE gid = 111;
	UPDATE base_layers.countries SET name='Kenya' WHERE gid = 114;
	UPDATE base_layers.countries SET name='Kyrgyzstan' WHERE gid = 115;
	UPDATE base_layers.countries SET name='Cambodia' WHERE gid = 116;
	UPDATE base_layers.countries SET name='Kiribati' WHERE gid = 117;
	UPDATE base_layers.countries SET name='Comoros' WHERE gid = 49;
	UPDATE base_layers.countries SET name='St. Kitts and Nevis' WHERE gid = 118;
	UPDATE base_layers.countries SET name='Dem. Rep. Korea' WHERE gid = 177;
	UPDATE base_layers.countries SET name='Korea' WHERE gid = 119;
	UPDATE base_layers.countries SET name='Kuwait' WHERE gid = 121;
	UPDATE base_layers.countries SET name='Cayman Is.' WHERE gid = 54;
	UPDATE base_layers.countries SET name='Kazakhstan' WHERE gid = 113;
	UPDATE base_layers.countries SET name='Lao PDR' WHERE gid = 122;
	UPDATE base_layers.countries SET name='Lebanon' WHERE gid = 123;
	UPDATE base_layers.countries SET name='Saint Lucia' WHERE gid = 126;
	UPDATE base_layers.countries SET name='Liechtenstein' WHERE gid = 127;
	UPDATE base_layers.countries SET name='Sri Lanka' WHERE gid = 128;
	UPDATE base_layers.countries SET name='Liberia' WHERE gid = 124;
	UPDATE base_layers.countries SET name='Lesotho' WHERE gid = 129;
	UPDATE base_layers.countries SET name='Lithuania' WHERE gid = 130;
	UPDATE base_layers.countries SET name='Luxembourg' WHERE gid = 131;
	UPDATE base_layers.countries SET name='Latvia' WHERE gid = 132;
	UPDATE base_layers.countries SET name='Libya' WHERE gid = 125;
	UPDATE base_layers.countries SET name='Morocco' WHERE gid = 135;
	UPDATE base_layers.countries SET name='Monaco' WHERE gid = 136;
	UPDATE base_layers.countries SET name='Moldova' WHERE gid = 137;
	UPDATE base_layers.countries SET name='Montenegro' WHERE gid = 146;
	UPDATE base_layers.countries SET name='St-Martin' WHERE gid = 134;
	UPDATE base_layers.countries SET name='Madagascar' WHERE gid = 138;
	UPDATE base_layers.countries SET name='Marshall Is.' WHERE gid = 141;
	UPDATE base_layers.countries SET name='Macedonia' WHERE gid = 142;
	UPDATE base_layers.countries SET name='Mali' WHERE gid = 143;
	UPDATE base_layers.countries SET name='Myanmar' WHERE gid = 145;
	UPDATE base_layers.countries SET name='Mongolia' WHERE gid = 147;
	UPDATE base_layers.countries SET name='Macao' WHERE gid = 133;
	UPDATE base_layers.countries SET name='N. Mariana Is.' WHERE gid = 148;
	UPDATE base_layers.countries SET name='Mauritania' WHERE gid = 150;
	UPDATE base_layers.countries SET name='Montserrat' WHERE gid = 151;
	UPDATE base_layers.countries SET name='Malta' WHERE gid = 144;
	UPDATE base_layers.countries SET name='Mauritius' WHERE gid = 152;
	UPDATE base_layers.countries SET name='Maldives' WHERE gid = 139;
	UPDATE base_layers.countries SET name='Malawi' WHERE gid = 153;
	UPDATE base_layers.countries SET name='Mexico' WHERE gid = 140;
	UPDATE base_layers.countries SET name='Malaysia' WHERE gid = 154;
	UPDATE base_layers.countries SET name='Mozambique' WHERE gid = 149;
	UPDATE base_layers.countries SET name='Namibia' WHERE gid = 155;
	UPDATE base_layers.countries SET name='New Caledonia' WHERE gid = 156;
	UPDATE base_layers.countries SET name='Niger' WHERE gid = 157;
	UPDATE base_layers.countries SET name='Norfolk Island' WHERE gid = 158;
	UPDATE base_layers.countries SET name='Nigeria' WHERE gid = 159;
	UPDATE base_layers.countries SET name='Nicaragua' WHERE gid = 160;
	UPDATE base_layers.countries SET name='Netherlands' WHERE gid = 162;
	UPDATE base_layers.countries SET name='Norway' WHERE gid = 163;
	UPDATE base_layers.countries SET name='Nepal' WHERE gid = 164;
	UPDATE base_layers.countries SET name='Nauru' WHERE gid = 165;
	UPDATE base_layers.countries SET name='Niue' WHERE gid = 161;
	UPDATE base_layers.countries SET name='New Zealand' WHERE gid = 166;
	UPDATE base_layers.countries SET name='Oman' WHERE gid = 167;
	UPDATE base_layers.countries SET name='Panama' WHERE gid = 169;
	UPDATE base_layers.countries SET name='Peru' WHERE gid = 171;
	UPDATE base_layers.countries SET name='Fr. Polynesia' WHERE gid = 181;
	UPDATE base_layers.countries SET name='Papua New Guinea' WHERE gid = 174;
	UPDATE base_layers.countries SET name='Philippines' WHERE gid = 172;
	UPDATE base_layers.countries SET name='Pakistan' WHERE gid = 168;
	UPDATE base_layers.countries SET name='Poland' WHERE gid = 175;
	UPDATE base_layers.countries SET name='St. Pierre and Miquelon' WHERE gid = 200;
	UPDATE base_layers.countries SET name='Pitcairn Is.' WHERE gid = 170;
	UPDATE base_layers.countries SET name='Puerto Rico' WHERE gid = 176;
	UPDATE base_layers.countries SET name='Palestine' WHERE gid = 180;
	UPDATE base_layers.countries SET name='Portugal' WHERE gid = 178;
	UPDATE base_layers.countries SET name='Palau' WHERE gid = 173;
	UPDATE base_layers.countries SET name='Paraguay' WHERE gid = 179;
	UPDATE base_layers.countries SET name='Qatar' WHERE gid = 182;
	UPDATE base_layers.countries SET name='Romania' WHERE gid = 183;
	UPDATE base_layers.countries SET name='Serbia' WHERE gid = 201;
	UPDATE base_layers.countries SET name='Russia' WHERE gid = 184;
	UPDATE base_layers.countries SET name='Rwanda' WHERE gid = 185;
	UPDATE base_layers.countries SET name='Saudi Arabia' WHERE gid = 187;
	UPDATE base_layers.countries SET name='Solomon Islands' WHERE gid = 194;
	UPDATE base_layers.countries SET name='Seychelles' WHERE gid = 209;
	UPDATE base_layers.countries SET name='Sudan' WHERE gid = 188;
	UPDATE base_layers.countries SET name='Sweden' WHERE gid = 206;
	UPDATE base_layers.countries SET name='Singapore' WHERE gid = 191;
	UPDATE base_layers.countries SET name='Saint Helena' WHERE gid = 193;
	UPDATE base_layers.countries SET name='Slovenia' WHERE gid = 205;
	UPDATE base_layers.countries SET name='Slovakia' WHERE gid = 204;
	UPDATE base_layers.countries SET name='Sierra Leone' WHERE gid = 195;
	UPDATE base_layers.countries SET name='San Marino' WHERE gid = 197;
	UPDATE base_layers.countries SET name='Senegal' WHERE gid = 190;
	UPDATE base_layers.countries SET name='Somalia' WHERE gid = 199;
	UPDATE base_layers.countries SET name='Suriname' WHERE gid = 203;
	UPDATE base_layers.countries SET name='S. Sudan' WHERE gid = 189;
	UPDATE base_layers.countries SET name='São Tomé and Principe' WHERE gid = 202;
	UPDATE base_layers.countries SET name='El Salvador' WHERE gid = 196;
	UPDATE base_layers.countries SET name='Sint Maarten' WHERE gid = 208;
	UPDATE base_layers.countries SET name='Syria' WHERE gid = 210;
	UPDATE base_layers.countries SET name='Swaziland' WHERE gid = 207;
	UPDATE base_layers.countries SET name='Turks and Caicos Is.' WHERE gid = 211;
	UPDATE base_layers.countries SET name='Chad' WHERE gid = 212;
	UPDATE base_layers.countries SET name='Fr. S. Antarctic Lands' WHERE gid = 14;
	UPDATE base_layers.countries SET name='Togo' WHERE gid = 213;
	UPDATE base_layers.countries SET name='Thailand' WHERE gid = 214;
	UPDATE base_layers.countries SET name='Tajikistan' WHERE gid = 215;
	UPDATE base_layers.countries SET name='Timor-Leste' WHERE gid = 217;
	UPDATE base_layers.countries SET name='Turkmenistan' WHERE gid = 216;
	UPDATE base_layers.countries SET name='Tunisia' WHERE gid = 220;
	UPDATE base_layers.countries SET name='Tonga' WHERE gid = 218;
	UPDATE base_layers.countries SET name='Turkey' WHERE gid = 221;
	UPDATE base_layers.countries SET name='Trinidad and Tobago' WHERE gid = 219;
	UPDATE base_layers.countries SET name='Taiwan' WHERE gid = 222;
	UPDATE base_layers.countries SET name='Tanzania' WHERE gid = 223;
	UPDATE base_layers.countries SET name='Ukraine' WHERE gid = 225;
	UPDATE base_layers.countries SET name='Uganda' WHERE gid = 224;
	UPDATE base_layers.countries SET name='United States' WHERE gid = 227;
	UPDATE base_layers.countries SET name='Uruguay' WHERE gid = 226;
	UPDATE base_layers.countries SET name='Uzbekistan' WHERE gid = 228;
	UPDATE base_layers.countries SET name='Vatican' WHERE gid = 229;
	UPDATE base_layers.countries SET name='St. Vin. and Gren.' WHERE gid = 230;
	UPDATE base_layers.countries SET name='Venezuela' WHERE gid = 231;
	UPDATE base_layers.countries SET name='British Virgin Is.' WHERE gid = 232;
	UPDATE base_layers.countries SET name='U.S. Virgin Is.' WHERE gid = 233;
	UPDATE base_layers.countries SET name='Vietnam' WHERE gid = 234;
	UPDATE base_layers.countries SET name='Vanuatu' WHERE gid = 235;
	UPDATE base_layers.countries SET name='Wallis and Futuna Is.' WHERE gid = 236;
	UPDATE base_layers.countries SET name='Samoa' WHERE gid = 237;
	UPDATE base_layers.countries SET name='Yemen' WHERE gid = 238;
	UPDATE base_layers.countries SET name='South Africa' WHERE gid = 239;
	UPDATE base_layers.countries SET name='Zambia' WHERE gid = 240;
	UPDATE base_layers.countries SET name='Zimbabwe' WHERE gid = 241;
	UPDATE base_layers.countries SET name='Indian Ocean Ter.' WHERE gid = 100;
	UPDATE base_layers.countries SET name='Siachen Glacier' WHERE gid = 112;
	UPDATE base_layers.countries SET name='N. Cyprus' WHERE gid = 55;
	UPDATE base_layers.countries SET name='Ashmore and Cartier Is.' WHERE gid = 13;
	UPDATE base_layers.countries SET name='Kosovo' WHERE gid = 120;

COMMIT;