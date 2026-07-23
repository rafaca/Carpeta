# castello.world

Working copy of the castello.world site on DreamHost.

- **Pull the live site into the repo**: run the "Pull castello.world from DreamHost"
  workflow (Actions tab → Run workflow). It copies the server's web directory into
  this folder on the `castello-world-import` branch.
- **Deploy**: any change to this folder on `main` triggers the
  "Deploy castello.world" workflow, which rsyncs it up to the server. It never
  deletes server-side files.

Both workflows need these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `CASTELLO_DREAMHOST_HOST` | `iad1-shared-b8-26.dreamhost.com` |
| `CASTELLO_DREAMHOST_USER` | the shell user that owns castello.world |
| `CASTELLO_DREAMHOST_SSH_KEY` | private key whose public half is in that user's `~/.ssh/authorized_keys` |
| `CASTELLO_DREAMHOST_SITE_PATH` | e.g. `/home/<user>/castello.world` |

This README is excluded from deployment.
