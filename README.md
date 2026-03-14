# website-images

backup of firebase images

## Import a new image

Use the Node.js CLI to copy a local file into this repo using the existing layout:

`year/month/day/<generated-uuid>/<original-filename>`

Add `--commit` to also `git add`, `git commit`, and `git push` the imported file on the current branch.
On success, the script prints both the relative repo path and the public URL to use.

macOS/Linux example:

```bash
node scripts/import-image.js "/absolute/path/to/photo.png"
```

Windows PowerShell example:

```powershell
node .\scripts\import-image.js "C:\path\to\photo.png"
```

Backfill to a specific date:

```bash
node scripts/import-image.js "/absolute/path/to/photo.png" --date 2026-03-14
```

Copy and immediately commit/push:

```bash
node scripts/import-image.js "/absolute/path/to/photo.png" --commit
```

Run from outside the repo by overriding the destination root:

```bash
node /path/to/website-images/scripts/import-image.js "/absolute/path/to/photo.png" --root /path/to/website-images
```
