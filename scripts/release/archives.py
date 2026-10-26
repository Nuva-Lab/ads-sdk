"""Deterministic Go proxy and source archives from an explicitly staged file tree."""
import gzip
import io
import json
from pathlib import Path
import sys
import tarfile
import zipfile

stage, output, version, module = sys.argv[1:]
stage, output = Path(stage), Path(output)
goversion = 'v' + version
escaped = ''.join('!' + char.lower() if char.isupper() else char for char in module)
proxy = output / 'go-proxy' / escaped / '@v'
proxy.mkdir(parents=True, exist_ok=True)
gofiles = sorted(path for path in (stage / 'go').rglob('*') if path.is_file())
archive = proxy / (goversion + '.zip')
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipped:
    for path in gofiles:
        name = f'{module}@{goversion}/{path.relative_to(stage / "go").as_posix()}'
        info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        zipped.writestr(info, path.read_bytes(), compresslevel=9)
(proxy / (goversion + '.mod')).write_bytes((stage / 'go/go.mod').read_bytes())
(proxy / (goversion + '.info')).write_text(json.dumps({'Version': goversion, 'Time': '2026-10-26T00:00:00Z'}, separators=(',', ':')) + '\n')
(proxy / 'list').write_text(goversion + '\n')
with (output / f'ads-sdk-source-{version}.tar.gz').open('wb') as target:
    with gzip.GzipFile(filename='', fileobj=target, mode='wb', mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w') as tar:
            for path in sorted((stage / 'source').rglob('*')):
                if not path.is_file():
                    continue
                name = f'ads-sdk-source-{version}/{path.relative_to(stage / "source").as_posix()}'
                data = path.read_bytes()
                info = tarfile.TarInfo(name)
                info.size, info.mode, info.mtime = len(data), 0o644, 0
                tar.addfile(info, io.BytesIO(data))
