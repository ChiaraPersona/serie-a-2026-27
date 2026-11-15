import gzip
import importlib.util
import io
import pathlib
import sys
import tarfile
import zipfile

sys.dont_write_bytecode = True
ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('historical_export', ROOT / 'scripts/repack-historical-export.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
work = ROOT / 'output/export-cleanup-2026-11-15/test'
work.mkdir(parents=True, exist_ok=True)
source, packed, restored = work / 'source.zip', work / 'packed.tar.xz', work / 'restored.zip'
bad, bad_restore = work / 'corrupt.tar.xz', work / 'corrupt-restored.zip'
if any(path.exists() for path in (source, packed, restored, bad, bad_restore)):
    raise RuntimeError('Test paths already exist')
try:
    with zipfile.ZipFile(source, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.comment = b'Historical export test'
        for name, data in [('folder/', b''), ('folder/empty.json', b''),
                           ('folder/roster.json.gz', gzip.compress(b'{"id":42,"value":null}', mtime=123)),
                           ('folder/città.txt', 'verifica è ⚽'.encode())]:
            info = zipfile.ZipInfo(name, (2026, 10, 19, 13, 12, 10))
            info.comment = b'original member comment'
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    module.pack(source, packed)
    assert module.verify(packed)['verifiedEntries'] == 4
    module.verify(packed, restored)
    with zipfile.ZipFile(source) as before, zipfile.ZipFile(restored) as after:
        assert before.namelist() == after.namelist()
        assert before.comment == after.comment
        for row in before.infolist():
            other = after.getinfo(row.filename)
            assert before.read(row) == after.read(other)
            for key in ('date_time', 'external_attr', 'internal_attr', 'create_system', 'comment', 'extra'):
                assert getattr(row, key) == getattr(other, key), key
    try:
        module.verify(packed, restored)
        raise AssertionError('Existing destination overwritten')
    except FileExistsError:
        pass
    try:
        module.safe_name('../escape')
        raise AssertionError('Unsafe archive path accepted')
    except ValueError:
        pass
    with tarfile.open(packed, 'r:xz') as before, tarfile.open(bad, 'w:xz') as after:
        for entry in before:
            if entry.isfile():
                data = before.extractfile(entry).read()
                if entry.name.endswith('città.txt'):
                    data = bytes([data[0] ^ 1]) + data[1:]
                after.addfile(entry, io.BytesIO(data))
            else:
                after.addfile(entry)
    try:
        module.verify(bad, bad_restore)
        raise AssertionError('Corrupt member accepted')
    except ValueError:
        assert not bad_restore.exists()
        assert not bad_restore.with_suffix('.zip.partial').exists()
    print('PASS self-contained restore: exact gzip/member bytes, directories, Unicode, ZIP metadata, overwrite and path guards')
finally:
    for path in (source, packed, restored, bad, bad_restore):
        if path.exists():
            path.unlink()
