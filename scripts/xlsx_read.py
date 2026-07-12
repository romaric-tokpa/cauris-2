"""Lecteur XLSX minimal (sans openpyxl) : lit chaque feuille en tableau 2D.
Gère sharedStrings, inlineStr, nombres. Usage : import et read_sheet(path, name)."""
import zipfile, re
from xml.etree import ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NSR = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def _col_to_idx(ref):
    m = re.match(r"([A-Z]+)(\d+)", ref)
    letters, row = m.group(1), int(m.group(2))
    c = 0
    for ch in letters:
        c = c * 26 + (ord(ch) - 64)
    return c - 1, row - 1


def _load_shared(z):
    if "xl/sharedStrings.xml" not in z.namelist():
        return []
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    out = []
    for si in root.findall(f"{NS}si"):
        # concat all <t> (handles rich text runs)
        txt = "".join(t.text or "" for t in si.iter(f"{NS}t"))
        out.append(txt)
    return out


def _sheet_map(z):
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {r.get("Id"): r.get("Target") for r in rels}
    m = {}
    for s in wb.find(f"{NS}sheets"):
        name = s.get("name")
        rid = s.get(f"{NSR}id")
        target = rid_to_target[rid]
        if not target.startswith("xl/"):
            target = "xl/" + target
        m[name] = target
    return m


def read_sheet(path, name):
    z = zipfile.ZipFile(path)
    shared = _load_shared(z)
    smap = _sheet_map(z)
    target = smap[name]
    root = ET.fromstring(z.read(target))
    data = root.find(f"{NS}sheetData")
    rows = []
    maxcol = 0
    parsed = []
    for row in data.findall(f"{NS}row"):
        cells = {}
        for c in row.findall(f"{NS}c"):
            ref = c.get("r")
            ci, ri = _col_to_idx(ref)
            t = c.get("t")
            v = c.find(f"{NS}v")
            is_node = c.find(f"{NS}is")
            val = None
            if t == "s" and v is not None:
                val = shared[int(v.text)]
            elif t == "inlineStr" and is_node is not None:
                val = "".join(x.text or "" for x in is_node.iter(f"{NS}t"))
            elif v is not None:
                txt = v.text
                try:
                    f = float(txt)
                    val = int(f) if f.is_integer() else f
                except (ValueError, TypeError):
                    val = txt
            cells[ci] = val
            maxcol = max(maxcol, ci)
        parsed.append(cells)
    for cells in parsed:
        rows.append([cells.get(i) for i in range(maxcol + 1)])
    return rows


if __name__ == "__main__":
    import sys, json
    path = sys.argv[1]
    name = sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 12
    rows = read_sheet(path, name)
    print(f"# {name} — {len(rows)} lignes")
    for i, r in enumerate(rows[:n]):
        # trim trailing None
        while r and r[-1] is None:
            r = r[:-1]
        print(i, r)
