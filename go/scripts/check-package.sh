#!/bin/sh
set -eu
sdk_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
consumer_dir=$(mktemp -d)
trap 'rm -r "$consumer_dir"' EXIT HUP INT TERM
python3 - "$sdk_dir" "$consumer_dir" <<'PY'
import json,sys,zipfile
from pathlib import Path
sdk,root=map(Path,sys.argv[1:]);module='github.com/Nuva-Lab/ads-sdk/go';version='v0.1.0-preview.2'
escaped=''.join('!'+c.lower() if c.isupper() else c for c in module)
proxy=root/'proxy'/escaped/'@v';proxy.mkdir(parents=True)
(proxy/(version+'.mod')).write_bytes((sdk/'go.mod').read_bytes())
(proxy/(version+'.info')).write_text(json.dumps({'Version':version,'Time':'2026-10-24T00:00:00Z'}))
(proxy/'list').write_text(version+'\n')
with zipfile.ZipFile(proxy/(version+'.zip'),'w',zipfile.ZIP_DEFLATED) as out:
 for path in sorted(sdk.rglob('*')):
  if path.is_file():
   out.write(path,module+'@'+version+'/'+path.relative_to(sdk).as_posix())
PY
mkdir "$consumer_dir/consumer"
cat > "$consumer_dir/consumer/go.mod" <<'MOD'
module example.com/independent-customer

go 1.22.0

require github.com/Nuva-Lab/ads-sdk/go v0.1.0-preview.2
MOD
cat > "$consumer_dir/consumer/consumer_test.go" <<'GO'
package customer
import (
 "testing"
 "context"
 admin "github.com/Nuva-Lab/ads-sdk/go"
)
func TestIndependentPackage(t *testing.T) {
 client,err:=admin.NewAdminClient("https://backend.invalid","local-fixture-key")
 if err!=nil {t.Fatal(err)}
 var issue func(context.Context,string)(admin.TokenResponse,error)=client.IssueUserToken
 var publish func(context.Context,string,admin.SkillRegistration)(admin.RegisteredSkill,error)=client.RegisterSkill
 _=issue;_=publish
}
GO
mkdir "$consumer_dir/consumer/docexample"
cp "$sdk_dir/../docs/examples/backend_client.go" "$consumer_dir/consumer/docexample/example.go"
cd "$consumer_dir/consumer"
GOTOOLCHAIN=local GOWORK=off GOPATH="$consumer_dir/gopath" GOMODCACHE="$consumer_dir/cache" GOPROXY="file://$consumer_dir/proxy" GOSUMDB=off GOPRIVATE='' GONOPROXY=none go test -mod=mod -modcacherw ./...
