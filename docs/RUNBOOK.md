# Runbook — Transfer Order

## Đường dẫn
```bash
cd /home/locdodoan/.openclaw/workspace/transfer-order-webapp
```

## Kiểm tra nhanh
```bash
git status
python3 --version
```

## Chạy thủ công
```bash
python3 server.py
```

## Service
```bash
systemctl --user status transfer-order-webapp --no-pager
systemctl --user restart transfer-order-webapp
journalctl --user -u transfer-order-webapp -n 100 --no-pager
```

## Health check
```bash
curl -I http://127.0.0.1:8892 || true
```

## Backup nhanh
```bash
/home/locdodoan/webapps/scripts/backup-webapps.sh transfer-order-webapp
```
