---
title: "Last.fm Tool Suite"
date: 2022-10-24
# Project thumb
image : "images/projects/lastfm-banner.png"
draft: false
# description
description: "LFM, short for \"last.fm\", consists of a suite of tools and APIs, written in Go, to interact unofficially with the Last.fm API and Discord Rich Presence."
author: "James Ding"
---

LFM, short for "last.fm", consists of a suite of tools and APIs, written in Go, to interact unofficially with the Last.fm API and Discord Rich Presence.

#### Composing Elements

The LFM suite consists of 3 elements:

- `lfm-api`  is a Go package that provides an interface to interact with the Last.fm API, allowing you to retrieve information about a users recent scrobbles, without the need for an API key.
- `lfm-cli` is a command-line interface implementing `lfm-api` to have the active scrobble displayed on Discord Rich Presence.
- `lfm-gui` is a graphical user interface that allows you to view your recent scrobbles and have the active scrobble displayed on Discord Rich Presence.

### Features

- Simple, easy-to-use API allowing for easy integration with other projects.
- Scheduler to update the active scrobble every 10 seconds, by default.
- Ability to control and customize every aspect of the Discord Rich Presence, including whether to include the album cover, loved indication, timestamps, persistent scrobble, and more.
- Follows a fully asynchronous programming model, allowing for the GUI to remain responsive while the API fetches data.

### Additional Information

See the [documentation homepage](https://lfm.twango.dev) for more information on how to use the LFM suite.

#### License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/twangodev/lfm-api/blob/main/LICENSE) file for more information.
