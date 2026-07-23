# castello.world

Working copy of the castello.world site on DreamHost.

- **Pull the live site into the repo**: run the "Pull castello.world from DreamHost"
  workflow (Actions tab → Run workflow). It copies the server's web directory into
  this folder on the `castello-world-import` branch.
- **Deploy**: any change to this folder on `main` triggers the
  "Deploy castello.world" workflow, which rsyncs it up to the server. It never
  deletes server-side files.

Both workflows default to the repo's existing DreamHost secrets and known values:

| Setting | Default |
| --- | --- |
| SSH key | existing `DREAMHOST_SSH_KEY` secret |
| Host | existing `DREAMHOST_HOST` secret, else `iad1-shared-b8-26.dreamhost.com` |
| User | `rafacastello` |
| Site path | `/home/rafacastello/castello.world` |

Each can be overridden with an optional `CASTELLO_DREAMHOST_*` repository secret
(`_SSH_KEY`, `_HOST`, `_USER`, `_SITE_PATH`) — no new secrets are required otherwise.

This README is excluded from deployment.
