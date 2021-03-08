#!/usr/bin/python

# Script for transforming json to csv
# Will use the json structure of the first line
#
# Usage: python json_to_csv.py <input_json_file> <output_csv_file>

import sys
import json
import csv
from datetime import datetime
import os

header = None
rows = []

with open(sys.argv[1]) as i:
    header = None
    for line in i:
        line_json = json.loads(line)
        if (header == None):
            header = line_json.keys()
        row = []
        for key in header:
            if key in line_json:
                try:
                    row.append(int(line_json[key]))
                except ValueError:
                    try:
                        row.append(float(line_json[key]))
                    except ValueError:
                        try:
                            row.append(datetime.strptime(line_json[key], '%Y-%m-%dT%H:%M:%S.%fZ'))
                        except ValueError:
                            row.append(line_json[key])
            else:
                row.append('')
            
        rows.append(row)

if len(sys.argv) >= 3:
    output = sys.argv[2]
else:
    output = os.path.splitext(os.path.basename(sys.argv[1]))[0] + '.csv'

# open a file for writing
o = open(output, 'w', encoding='utf-8')

# create the csv writer object
csvwriter = csv.writer(o, delimiter=';', quotechar='"', quoting=csv.QUOTE_MINIMAL)

csvwriter.writerow(header)
csvwriter.writerows(rows)

o.close()
