from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import argparse

class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Local review must not combine cached modules with a changing catalogue.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

parser=argparse.ArgumentParser(description='Local museum preview')
parser.add_argument('--port',type=int,default=43203)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/'dist'
print(f'荆楚文化本地预览: http://127.0.0.1:{args.port}/',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),partial(PreviewHandler,directory=str(root))).serve_forever()
