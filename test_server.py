import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import server


class PersonnelStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / 'test.sqlite3'
        self.db_patch = patch.object(server, 'DB_PATH', self.db)
        self.data_patch = patch.object(server, 'DATA_DIR', Path(self.tmp.name))
        self.db_patch.start(); self.data_patch.start()

    def tearDown(self):
        self.db_patch.stop(); self.data_patch.stop(); self.tmp.cleanup()

    def test_seeds_latest_record_once_and_preserves_records(self):
        people = [{'id': 'p1', 'name': 'Trịnh Quang Dũng', 'role': 'escort', 'gender': 'Ông'}]
        with server.db_conn() as conn:
            conn.execute("INSERT INTO transfer_order_records VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                         ('r1','2026-08-03T00:00:00+00:00','2026-08-03T00:00:00+00:00','u','','','','','','','',json.dumps({'peopleList': people})))
        self.assertEqual(server.list_people()[0]['name'], 'Trịnh Quang Dũng')
        self.assertEqual(server.list_people(), server.list_people())
        with server.db_conn() as conn:
            self.assertEqual(conn.execute('SELECT COUNT(*) FROM transfer_order_records').fetchone()[0], 1)

    def test_save_replaces_master_atomically(self):
        server.save_people([{'id':'a','name':'A','role':'driver'}], 'tester')
        server.save_people([{'id':'b','name':'B','role':'guard'}], 'tester')
        self.assertEqual([p['id'] for p in server.list_people()], ['b'])

    def test_rejects_invalid_people(self):
        server.save_people([{'name':'','role':'driver'}, {'name':'X','role':'bad'}], 'tester')
        self.assertEqual(server.list_people(), [])


if __name__ == '__main__':
    unittest.main()
