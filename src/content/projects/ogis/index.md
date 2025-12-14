---
title: "ogis"
summary: "Open Graph Images as a Service. Fast, free, and built with Rust."
date: "Dec 13 2025"
draft: false
tags:
  - Rust
  - Axum
  - Tokio
  - SvelteKit
  - TypeScript
  - Open Graph
demoUrl: https://ogis.dev/
repoUrl: https://github.com/twangodev/ogis
---

## Overview

ogis (Open Graph Images as a Service) is a fast, free service for generating beautiful social media preview images dynamically via URL parameters. No design skills required — just pass your title and description, pick a template, and get a polished 1200x630 PNG.

## The Problem

Existing OG image solutions were either too complex, too slow, or required too much setup. There wasn't a simple, "just works" way to generate good-looking Open Graph images without spinning up infrastructure or wrestling with configuration.

This became apparent while working at [Fish Audio](https://fish.audio), where we needed flexible, good-looking OG images at scale. Rather than cobble together existing solutions, I built ogis to solve this cleanly.

## How It Works

```
https://img.ogis.dev/?title=Hello+World&description=My+description&template=gradient-cobalt
```

That's it. Hit the URL, get a PNG. The service handles text rendering, layout, and image composition server-side.

## Features

- **78+ Templates**: From minimal to gradient blobs, there's a style for every brand
- **Fast**: Rust-based backend using Axum/Tokio generates images in milliseconds
- **Simple API**: Just URL query parameters — no SDK required (though one exists)
- **Self-Hostable**: AGPL-3.0 licensed, run your own instance with Docker
- **Secure**: HMAC-SHA256 authentication, SSRF protection, input validation
- **TypeScript SDK**: `npm install ogis` for easy integration

## Architecture

The backend is built in Rust for performance:

- **Axum** web framework with **Tokio** async runtime
- **resvg/tiny-skia** for SVG to PNG rendering
- **cosmic-text** for accurate text measurement and truncation
- **Moka** for image caching with configurable TTL
- Custom DNS resolver for SSRF protection on external image fetches

The frontend playground and docs are built with SvelteKit.

## Scale

ogis currently handles production traffic:

- ~30K requests/day
- 50GB/day peak bandwidth (via Cloudflare)
- Used in production at Fish Audio

## Quick Start

**Use the public instance:**
```
https://img.ogis.dev/?title=Your+Title&template=twilight
```

**Or self-host:**
```bash
docker run -p 3000:3000 twango/ogis:latest
```

**TypeScript SDK:**
```typescript
import { OgisClient } from 'ogis';

const ogis = new OgisClient({
  baseUrl: 'https://img.ogis.dev',
  defaults: { template: 'gradient-cobalt' }
});

const url = ogis.generateUrl({ title: 'Hello World' });
```