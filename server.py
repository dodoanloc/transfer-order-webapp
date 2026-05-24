#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError
import json
import os
import tempfile
import html
import datetime
import sqlite3
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
CCCD_API = os.environ.get('CCCD_API', 'http://127.0.0.1:8010')
DATA_DIR = ROOT / 'data'
DB_PATH = DATA_DIR / 'transfer_order_records.sqlite3'


def db_conn():
    DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('''CREATE TABLE IF NOT EXISTS transfer_order_records (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_by_name TEXT,
        doc_no TEXT,
        doc_date TEXT,
        from_branch TEXT,
        to_branch TEXT,
        escort_name TEXT,
        summary TEXT,
        payload_json TEXT NOT NULL
    )''')
    return conn


def verify_cccd_user(username: str, password: str):
    data = json.dumps({'username': username, 'password': password}).encode('utf-8')
    req = urlrequest.Request(
        f'{CCCD_API}/api/auth/login',
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urlrequest.urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read().decode('utf-8'))
            return payload.get('user') if payload.get('success') else None
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return None


def is_admin_user(user):
    if not user:
        return False
    username = str(user.get('username') or user.get('user') or '').strip().lower()
    role = str(user.get('role') or user.get('user_role') or user.get('permission') or '').strip().lower()
    roles = user.get('roles') or []
    if isinstance(roles, str):
        roles = [roles]
    roles = [str(x).strip().lower() for x in roles]
    return bool(
        user.get('is_admin')
        or user.get('isAdmin')
        or user.get('admin')
        or username == 'admin'
        or role == 'admin'
        or 'admin' in roles
    )


def xml_escape(value):
    return html.escape(str(value or ''), quote=False)


def para(text='', bold=False, italic=False, align=None, indent=False, size=30):
    jc = f'<w:jc w:val="{align}"/>' if align else ''
    ind = '<w:ind w:firstLine="567"/>' if indent else ''
    b = '<w:b/><w:bCs/>' if bold else ''
    i = '<w:i/><w:iCs/>' if italic else ''
    return f'''<w:p><w:pPr>{jc}{ind}<w:spacing w:after="0" w:line="312" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>{b}{i}<w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>{b}{i}<w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr><w:t xml:space="preserve">{xml_escape(text)}</w:t></w:r></w:p>'''


def compact_para(text='', bold=False, italic=False, align=None, size=26):
    return para(text, bold=bold, italic=italic, align=align, size=size).replace('w:line="312"', 'w:line="240"')


def header_table(d):
    doc_no = d.get('docNo') if str(d.get('docNo') or '').strip() else '           /QĐ-NHNo.TX-KTNQ'
    date_line = d.get('dateLine') or ''
    return f'''<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="5143"/><w:gridCol w:w="5494"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="5143" w:type="dxa"/></w:tcPr>{para('NGÂN HÀNG NÔNG NGHIỆP', bold=True, align='center', size=24)}{para('VÀ PHÁT TRIỂN NÔNG THÔN', bold=True, align='center', size=24)}{para('VIỆT NAM', bold=True, align='center', size=24)}{para('CHI NHÁNH THỌ XUÂN THANH HÓA', bold=True, size=24)}{para('────────────', align='center', size=18)}{para('Số: ' + doc_no, align='center', size=30)}</w:tc><w:tc><w:tcPr><w:tcW w:w="5494" w:type="dxa"/></w:tcPr>{para('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold=True, align='center', size=24)}{para('Độc lập - Tự do - Hạnh phúc', bold=True, align='center', size=24)}{para('──────────────', align='center', size=18)}{para(date_line, italic=True, align='center', size=30)}</w:tc></w:tr></w:tbl>'''


def make_docx(payload):
    d = payload.get('order') or {}
    goods = payload.get('goodsLines') or []
    people = payload.get('peopleLines') or []
    
    body = [
        header_table(d),
        para('LỆNH ĐIỀU CHUYỂN', bold=True, align='center', size=32),
        para('KIÊM GIẤY UỶ QUYỀN ÁP TẢI HÀNG ĐẶC BIỆT', bold=True, align='center', size=32),
        para('Căn cứ Quy định số 4368/QyĐ-NHNo-TCKT ngày 25/12/2024 của Tổng Giám đốc về giao nhận, bảo quản, vận chuyển tiền mặt, tài sản quý, giấy tờ có giá, ấn chỉ quan trọng, tài sản khác;', italic=True, align='both', indent=True),
        para(f"Căn cứ văn bản phê duyệt tiếp quỹ tiền mặt số          /NHNo.TH-KTNQ ngày {d.get('docDateText','')} của Giám đốc Agribank CN Thanh Hóa.", bold=True, italic=True, align='both', indent=True),
        para('Theo đề nghị của Trưởng phòng Kế toán và Ngân quỹ.', bold=True, italic=True, indent=True),
        para('GIÁM ĐỐC QUYẾT ĐỊNH:', bold=True, align='center'),
        para('Điều 1. Điều chuyển hàng đặc biệt với các nội dung sau:', bold=True, indent=True),
        para('1. Loại hàng đặc biệt, gồm có:', bold=True, indent=True),
    ]
    
    for line in goods:
        body.append(para(line, bold=True, indent=line.startswith('-')))
    
    body += [
        para(f"2. Nơi đi: {d.get('fromBranch','')}", bold=True, indent=True),
        para(f"3. Nơi đến: {d.get('toBranch','')}", bold=True, indent=True),
        para(f"4. Phương tiện vận chuyển: Xe chuyên dùng biển số: {d.get('vehiclePlate','')}", bold=True, indent=True),
        para(f"5. Thời gian thực hiện: {d.get('executionDate','')}", bold=True, indent=True),
        para('Điều 2. Thành phần tổ vận chuyển, áp tải hàng đặc biệt (ghi rõ họ tên, chức danh từng người):', indent=True),
    ]
    
    for line in people:
        body.append(para(line, align='both', indent=True))
    
    body += [
        para('Điều 3. Ủy quyền cho Tổ trưởng là người áp tải chịu trách nhiệm chính cùng các ông, bà có tên tại Điều 2 chịu trách nhiệm giao, nhận, bảo quản, áp tải, vận chuyển hàng đặc biệt đảm bảo tuyệt đối an toàn, bí mật theo Quy định số 4368/QyĐ-NHNo-TCKT ngày 25/12/2024 của Tổng Giám đốc về giao nhận, bảo quản, vận chuyển tiền mặt, tài sản quý, giấy tờ có giá, ấn chỉ quan trọng, tài sản khác và quy định của pháp luật, NHNN.', align='both', indent=True),
        para('Điều 4. Quyết định này có hiệu lực kể từ ngày ký và chấm dứt khi kết thúc giao/nhận hàng đặc biệt.', align='both', indent=True),
        compact_para(''),
        '<w:tbl><w:tblGrid><w:gridCol w:w="5143"/><w:gridCol w:w="5494"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="5143" w:type="dxa"/></w:tcPr>' + compact_para('Nơi nhận:', italic=True, size=24) + compact_para('- P. KTNQ;', size=22) + compact_para('- Lưu: Đơn vị.', size=22) + '</w:tc><w:tc><w:tcPr><w:tcW w:w="5494" w:type="dxa"/><w:tcMar><w:left w:w="1600" w:type="dxa"/></w:tcMar></w:tcPr>' + compact_para('GIÁM ĐỐC', bold=True, align='center') + compact_para('(Ký tên, đóng dấu)', italic=True, align='center', size=22) + '</w:tc></w:tr></w:tbl>'
    ]
    
    document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{''.join(body)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="851" w:bottom="1134" w:left="1418" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>'''
    
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.docx')
    tmp.close()
    with ZipFile(tmp.name, 'w', ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        z.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        z.writestr('word/document.xml', document_xml)
    return tmp.name


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def _json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self):
        length = int(self.headers.get('Content-Length') or '0')
        raw = self.rfile.read(length) if length else b'{}'
        return json.loads(raw.decode('utf-8') or '{}')

    def _auth_user(self, payload):
        auth = payload.get('auth') or {}
        return verify_cccd_user(auth.get('username',''), auth.get('password',''))

    def do_POST(self):
        if self.path == '/api/auth/login':
            payload = self._read_json()
            user = verify_cccd_user(payload.get('username',''), payload.get('password',''))
            if not user:
                return self._json(401, {'success': False, 'detail': 'Sai tài khoản hoặc mật khẩu'})
            return self._json(200, {'success': True, 'user': user})
        if self.path == '/api/export-docx':
            payload = self._read_json()
            auth = payload.get('auth') or {}
            user = verify_cccd_user(auth.get('username',''), auth.get('password',''))
            if not user:
                return self._json(401, {'success': False, 'detail': 'Phiên đăng nhập không hợp lệ'})
            docx_path = make_docx(payload)
            filename = 'lenh-dieu-chuyen-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S') + '.docx'
            data = Path(docx_path).read_bytes()
            try:
                Path(docx_path).unlink(missing_ok=True)
            except Exception:
                pass
            self.send_response(200)
            self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if self.path == '/api/records/save':
            payload = self._read_json()
            user = self._auth_user(payload)
            if not user:
                return self._json(401, {'success': False, 'detail': 'Phiên đăng nhập không hợp lệ'})
            record = payload.get('record') or {}
            rid = record.get('id') or datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            username = user.get('username') or payload.get('auth', {}).get('username') or ''
            display_name = user.get('full_name') or user.get('fullName') or user.get('name') or user.get('display_name') or username
            order = record.get('order') or {}
            people = record.get('people') or {}
            summary = record.get('summary') or ''
            with db_conn() as conn:
                existing = conn.execute('SELECT created_at FROM transfer_order_records WHERE id=?', (rid,)).fetchone()
                conn.execute('''INSERT OR REPLACE INTO transfer_order_records
                    (id, created_at, updated_at, created_by, created_by_name, doc_no, doc_date, from_branch, to_branch, escort_name, summary, payload_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
                    rid,
                    existing['created_at'] if existing else now,
                    now,
                    username,
                    display_name,
                    order.get('docNo') or '',
                    order.get('docDate') or '',
                    order.get('fromBranch') or '',
                    order.get('toBranch') or '',
                    (people.get('escort') or {}).get('name') or '',
                    summary,
                    json.dumps(record, ensure_ascii=False),
                ))
            return self._json(200, {'success': True, 'id': rid})
        if self.path == '/api/records/list':
            payload = self._read_json()
            user = self._auth_user(payload)
            if not user:
                return self._json(401, {'success': False, 'detail': 'Phiên đăng nhập không hợp lệ'})
            with db_conn() as conn:
                rows = conn.execute('''SELECT id, created_at, updated_at, created_by, created_by_name, doc_no, doc_date, from_branch, to_branch, escort_name, summary, payload_json
                    FROM transfer_order_records ORDER BY datetime(created_at) DESC LIMIT 200''').fetchall()
            return self._json(200, {'success': True, 'records': [dict(r) for r in rows]})
        if self.path == '/api/records/get':
            payload = self._read_json()
            user = self._auth_user(payload)
            if not user:
                return self._json(401, {'success': False, 'detail': 'Phiên đăng nhập không hợp lệ'})
            rid = payload.get('id') or ''
            with db_conn() as conn:
                row = conn.execute('SELECT payload_json FROM transfer_order_records WHERE id=?', (rid,)).fetchone()
            if not row:
                return self._json(404, {'success': False, 'detail': 'Không tìm thấy bản ghi'})
            return self._json(200, {'success': True, 'record': json.loads(row['payload_json'])})
        if self.path == '/api/records/delete':
            payload = self._read_json()
            user = self._auth_user(payload)
            if not user:
                return self._json(401, {'success': False, 'detail': 'Phiên đăng nhập không hợp lệ'})
            if not is_admin_user(user):
                return self._json(403, {'success': False, 'detail': 'Chỉ tài khoản admin được xoá bản ghi'})
            rid = payload.get('id') or ''
            if not rid:
                return self._json(400, {'success': False, 'detail': 'Thiếu ID bản ghi'})
            with db_conn() as conn:
                cur = conn.execute('DELETE FROM transfer_order_records WHERE id=?', (rid,))
                deleted = cur.rowcount
            if not deleted:
                return self._json(404, {'success': False, 'detail': 'Không tìm thấy bản ghi'})
            return self._json(200, {'success': True, 'deleted': deleted})
        return self._json(404, {'success': False, 'detail': 'Not found'})

if __name__ == '__main__':
    host = '0.0.0.0'
    port = int(os.environ.get('PORT', '8892'))
    print(f'Transfer Order Webapp: http://{host}:{port}')
    ThreadingHTTPServer((host, port), Handler).serve_forever()
