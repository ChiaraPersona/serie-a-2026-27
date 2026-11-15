"""Self-contained historical ZIP storage. No sports builders or live data writes."""
import argparse
import base64
import calendar
import hashlib
import io
import json
import pathlib
import tarfile
import time
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
META = '__archive_storage__/original-zip-metadata-v1.json'


def rename_verified(source, destination):
    for attempt in range(50):
        if destination.exists():
            raise FileExistsError(destination)
        try:
            source.rename(destination)
            return
        except PermissionError as error:
            if getattr(error, 'winerror', None) not in (5, 32) or attempt == 49:
                raise
            time.sleep(0.1)


def digest_stream(stream, target=None):
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(chunk)
        if target is not None:
            target.write(chunk)
    return digest.hexdigest()


def safe_name(name):
    normalized = name.replace('\\', '/')
    parts = pathlib.PurePosixPath(normalized).parts
    if not parts or normalized.startswith('/') or '..' in parts or ':' in parts[0]:
        raise ValueError('Unsafe archive path: ' + name)
    if normalized == META:
        raise ValueError('Reserved metadata path already present')


def local_path(value, prefix):
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT / prefix):
        raise ValueError('Outside allowed archive directory: ' + str(path))
    return path


def pack(source, destination):
    if destination.exists():
        raise FileExistsError(destination)
    with source.open('rb') as stream:
        original_hash = digest_stream(stream)
    rows = []
    with zipfile.ZipFile(source) as archive:
        if archive.testzip() is not None:
            raise ValueError('Original ZIP CRC verification failed')
        for entry in archive.infolist():
            safe_name(entry.filename)
            with archive.open(entry) as stream:
                sha256 = digest_stream(stream)
            rows.append(dict(name=entry.filename, size=entry.file_size, sha256=sha256,
                             date_time=entry.date_time, compress_type=entry.compress_type,
                             external_attr=entry.external_attr, internal_attr=entry.internal_attr,
                             create_system=entry.create_system,
                             extra=base64.b64encode(entry.extra).decode(),
                             comment=base64.b64encode(entry.comment).decode()))
        metadata = dict(schemaVersion=1, originalName=source.name,
                        originalZipBytes=source.stat().st_size, originalZipSha256=original_hash,
                        archiveComment=base64.b64encode(archive.comment).decode(), entries=rows,
                        note='Member bytes and ZIP metadata preserved; a rebuilt ZIP container need not have the original ZIP byte hash.')
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + '.partial')
        if temporary.exists():
            raise FileExistsError(temporary)
        compression_complete = False
        try:
            with tarfile.open(temporary, 'w:xz', preset=6, format=tarfile.PAX_FORMAT) as output:
                content = json.dumps(metadata, ensure_ascii=False, separators=(',', ':')).encode()
                header = tarfile.TarInfo(META)
                header.size = len(content)
                header.mode = 0o644
                output.addfile(header, io.BytesIO(content))
                for index, (entry, row) in enumerate(zip(archive.infolist(), rows)):
                    info = tarfile.TarInfo(entry.filename)
                    info.size = row['size']
                    info.mode = 0o644
                    info.mtime = calendar.timegm(tuple(row['date_time']) + (0, 0, 0))
                    if entry.is_dir():
                        info.type = tarfile.DIRTYPE
                        output.addfile(info)
                    else:
                        with archive.open(entry) as stream:
                            output.addfile(info, stream)
                    if (index + 1) % 1000 == 0:
                        print(json.dumps(dict(packedEntries=index + 1)), flush=True)
            compression_complete = True
            rename_verified(temporary, destination)
        finally:
            if temporary.exists() and not compression_complete:
                temporary.unlink()
    return metadata


def read_metadata(archive):
    first = archive.next()
    if first.name != META or not first.isfile():
        raise ValueError('Missing historical ZIP metadata')
    with archive.extractfile(first) as stream:
        metadata = json.load(stream)
    if metadata['schemaVersion'] != 1:
        raise ValueError('Unknown archive schema')
    names = [row['name'] for row in metadata['entries']]
    if len(names) != len(set(names)):
        raise ValueError('Repeated archive member names')
    for name in names:
        safe_name(name)
    return metadata


def remaining_entries(archive):
    while True:
        entry = archive.next()
        if entry is None:
            return
        yield entry


def verify(source, restore=None):
    output = None
    temporary = None
    complete = False
    if restore is not None:
        if restore.exists():
            raise FileExistsError(restore)
        restore.parent.mkdir(parents=True, exist_ok=True)
        temporary = restore.with_suffix(restore.suffix + '.partial')
        if temporary.exists():
            raise FileExistsError(temporary)
        output = zipfile.ZipFile(temporary, 'x', allowZip64=True)
    try:
        with tarfile.open(source, 'r|xz') as archive:
            metadata = read_metadata(archive)
            expected = {row['name']: row for row in metadata['entries']}
            seen = set()
            for entry in remaining_entries(archive):
                name = entry.name + '/' if entry.isdir() and entry.name + '/' in expected else entry.name
                row = expected.get(name)
                if row is None or name in seen or entry.size != row['size']:
                    raise ValueError('Unexpected archive member: ' + entry.name)
                seen.add(name)
                target = None
                if output is not None:
                    info = zipfile.ZipInfo(row['name'], tuple(row['date_time']))
                    for key in ('compress_type', 'external_attr', 'internal_attr', 'create_system'):
                        setattr(info, key, row[key])
                    info.extra = base64.b64decode(row['extra'])
                    info.comment = base64.b64decode(row['comment'])
                    target = output.open(info, 'w', force_zip64=True)
                try:
                    if entry.isdir():
                        actual = hashlib.sha256(b'').hexdigest()
                    elif entry.isfile():
                        with archive.extractfile(entry) as stream:
                            actual = digest_stream(stream, target)
                    else:
                        raise ValueError('Unsupported archive entry type')
                finally:
                    if target is not None:
                        target.close()
                        info.external_attr = row['external_attr']
                if actual != row['sha256']:
                    raise ValueError('Content hash mismatch: ' + entry.name)
            if seen != set(expected):
                raise ValueError('Archive members missing')
            if output is not None:
                output.comment = base64.b64decode(metadata['archiveComment'])
            complete = True
            return dict(verifiedEntries=len(seen), originalZipBytes=metadata['originalZipBytes'],
                        archivedBytes=source.stat().st_size, originalZipSha256=metadata['originalZipSha256'])
    finally:
        if output is not None:
            output.close()
            if complete:
                rename_verified(temporary, restore)
            elif temporary.exists():
                temporary.unlink()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['pack', 'verify', 'restore'])
    parser.add_argument('source')
    parser.add_argument('--output')
    args = parser.parse_args()
    if args.mode == 'pack':
        source = local_path(args.source, 'output/exports')
        output = local_path(args.output, 'data/technical-archive/exports')
        pack(source, output)
        print(json.dumps(verify(output)), flush=True)
    else:
        source = local_path(args.source, 'data/technical-archive/exports')
        output = local_path(args.output, 'output/exports') if args.mode == 'restore' else None
        print(json.dumps(verify(source, output)), flush=True)
