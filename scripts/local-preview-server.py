"""Serve the local site without requiring a console window."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class QuietHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Local files can change without a build or a different import URL.
        # Ignore conditional requests too: size/mtime can miss rapid edits.
        for header in ('If-Modified-Since', 'If-None-Match'):
            if header in self.headers:
                del self.headers[header]
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    server = ThreadingHTTPServer(("127.0.0.1", 8000), partial(QuietHandler, directory=str(root)))
    server.serve_forever()
