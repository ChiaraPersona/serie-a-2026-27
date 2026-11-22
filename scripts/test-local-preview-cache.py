"""Exercise the real preview handler, including same-size, same-mtime edits."""
import importlib.util
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
import os
import tempfile
import threading
import urllib.request

spec = importlib.util.spec_from_file_location('preview', Path(__file__).with_name('local-preview-server.py'))
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)

with tempfile.TemporaryDirectory() as directory:
    file = Path(directory) / 'module.mjs'
    file.write_text('export default 1;', encoding='utf-8')
    original_time = file.stat().st_mtime_ns
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(preview.QuietHandler, directory=directory))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        url = f'http://127.0.0.1:{server.server_port}/module.mjs?v=unchanged'
        with urllib.request.urlopen(url) as response:
            modified = response.headers['Last-Modified']
            assert 'no-store' in response.headers['Cache-Control']
            assert response.read() == b'export default 1;'
        file.write_text('export default 2;', encoding='utf-8')
        os.utime(file, ns=(original_time, original_time))
        request = urllib.request.Request(url, headers={'If-Modified-Since': modified, 'If-None-Match': 'old'})
        with urllib.request.urlopen(request) as response:
            assert response.status == 200
            assert response.read() == b'export default 2;'
            assert 'no-store' in response.headers['Cache-Control']
        print('PASS: same URL, size and mtime return updated module; caching disabled')
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
