# Vendored packages

`cobe/` is a Git subtree of [shuding/cobe](https://github.com/shuding/cobe), with local flight-trace extensions. The root `.gemote` records its upstream remote.

To check upstream changes:

```sh
gemote sync
git fetch cobe
git log cobe/main -5 --oneline
```

To merge upstream updates, run from the repository root with a clean working tree:

```sh
git subtree pull --prefix=packages/cobe cobe main --squash
bun run --filter cobe build
```

The subtree pull creates commits. Preserve the local arc `progress` and `trailLength` extensions when resolving conflicts.
