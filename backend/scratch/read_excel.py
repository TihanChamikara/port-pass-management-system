import zipfile
import xml.etree.ElementTree as ET
import sys
import codecs

def extract_excel_text(filepath, output_path):
    try:
        with codecs.open(output_path, 'w', 'utf-8') as out_f:
            with zipfile.ZipFile(filepath, 'r') as z:
                # Get shared strings
                shared_strings = []
                if 'xl/sharedStrings.xml' in z.namelist():
                    strings_xml = z.read('xl/sharedStrings.xml')
                    root = ET.fromstring(strings_xml)
                    for si in root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                        t_nodes = si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                        text = "".join([t.text for t in t_nodes if t.text])
                        shared_strings.append(text)
                
                # Read worksheets
                sheet_files = [f for f in z.namelist() if f.startswith('xl/worksheets/sheet') and f.endswith('.xml')]
                
                for sheet_file in sheet_files:
                    out_f.write(f"--- {sheet_file} ---\n")
                    sheet_xml = z.read(sheet_file)
                    root = ET.fromstring(sheet_xml)
                    
                    rows = root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
                    for row in rows:
                        row_data = []
                        for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                            v_node = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                            if v_node is not None:
                                v = v_node.text
                                if c.get('t') == 's':
                                    row_data.append(shared_strings[int(v)])
                                else:
                                    row_data.append(v)
                            else:
                                row_data.append("")
                        if any(row_data):
                            out_f.write(" | ".join(row_data) + "\n")
                    out_f.write("\n\n")
                    
    except Exception as e:
        with codecs.open(output_path, 'a', 'utf-8') as out_f:
            out_f.write(f"Error reading {filepath}: {e}\n")

if __name__ == "__main__":
    extract_excel_text(sys.argv[1], sys.argv[2])
