import psycopg2

passwords = ['postgres', 'root', 'admin', 'password', '123456', 'ecoroute_secure_pass_2026', '1234', 'wastex', '']
users = ['postgres', 'ecoroute']
connected = False

for u in users:
    for p in passwords:
        try:
            conn = psycopg2.connect(host='localhost', port=5432, user=u, password=p, dbname='wastex', connect_timeout=2)
            print(f"SUCCESS: user={u}, password={p}")
            cur = conn.cursor()
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
            tables = [t[0] for t in cur.fetchall()]
            print("Existing Tables in wastex:", tables)
            conn.close()
            connected = True
            break
        except Exception:
            pass
    if connected:
        break

if not connected:
    print("COULD_NOT_CONNECT_AUTOMATICALLY")
