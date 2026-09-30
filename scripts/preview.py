from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
root=Path(__file__).resolve().parents[1]/'dist'
print('荆楚 · 器物经纬: http://127.0.0.1:43203/',flush=True)
ThreadingHTTPServer(('127.0.0.1',43203),partial(SimpleHTTPRequestHandler,directory=str(root))).serve_forever()
