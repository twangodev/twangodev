---
title: "ogis"
summary: "Open Graph Images as a Service. Fast, free, and built with Rust."
date: "Dec 13 2025"
draft: false
tags:
  - Rust
  - Axum
  - SvelteKit
  - TypeScript
demoUrl: https://ogis.dev/
repoUrl: https://github.com/twangodev/ogis
---

## Overview

ogis (Open Graph Images as a Service) is a fast, free service for generating beautiful social media preview images via URL. No design skills required — just pass your title, pick a template, and get a polished 1200x630 PNG.

Built with Rust for speed. 78+ templates included.

## Why

Existing OG image solutions were either too complex or too slow. There wasn't a simple way to just generate good-looking images without a lot of setup.

This started at [Fish Audio](https://fish.audio), where we needed flexible OG images at scale. Rather than wrestle with existing tools, I built ogis.

## Usage

```
https://img.ogis.dev/?title=Hello+World&template=gradient-cobalt
```

That's it. Hit the URL, get a PNG.

## Scale

- ~30K requests/day
- 50GB/day peak bandwidth (via Cloudflare)
- Used in production at Fish Audio