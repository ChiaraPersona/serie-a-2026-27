"""Serve the local site without requiring a console window."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    server = ThreadingHTTPServer(("127.0.0.1", 8000), partial(QuietHandler, directory=str(root)))
    server.serve_forever()
