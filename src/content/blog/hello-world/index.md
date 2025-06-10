---
title: "First Blog Post, Hello World!"
summary: "Not much of a blogger, but we all start somewhere"
date: "Jun 8 2025"
draft: false
tags:
  - misc
---

Just revamped my portfolio, I guess this is going to be my first blog post. I'll walk you through the process of building this site, and share some of my insights along the way.

To preface, I enjoy backend development more than frontend—it's nothing personal, just my preference. Starting from scratch was not going to be time effective, so I opted to use [Astro Sphere](https://github.com/markhorn-dev/astro-sphere). It's an open source theme which matched my taste.

![astro.jpg](../../../../public/assets/astro.jpg)

Setup was pretty straight-forward, and I was able to get the site up and running in no time.

But _your_ website should really be _yours_ right? So we obviously need to tweak it a bit.

## Hello World

The biggest tweak I made was to the homepage. As you may have noticed, there's a giant globe, with a bunch of arcs from seemingly arbitrary locations (though the SF Bay Area seems like a hotspot).

I've enjoyed the topic of aviation for a while now—I've been a member of [VATSIM](https://vatsim.net) for a couple years at this point, I thought it would be fun to show all my IRL flights around the world. I guess you could say some inspiration came from [Cloudflare's Home Page](https://cloudflare.com), which has a similar globe animation, or even [GitHub's Globe](https://github.com/globe).

First, how do we get my flight data?

I actually have been tracking my flights through [myFlightradar24](https://my.flightradar24.com/), a personal logbook of all my flights. They don't have a public API, at least to my knowledge, so we have to figure out how to get the data out of there.

![mfr24.jpg](/assets/mfr24.jpg)

It turns out, they leave flight data within the **data-paths** attribute of their map. So all we need to do is just scrape that data, which is what the **./arc-gen** script does.

That's it! The script generates a JSON file with all my flight data, which is then fed in client-side to the globe component. The globe is built with [Globe.gl](https://globe.gl), which uses Three.js under the hood. It's a great library for visualizing geospatial data, and it was perfect for what I needed.

So yeah, there's my Hello World snippet for this site.
