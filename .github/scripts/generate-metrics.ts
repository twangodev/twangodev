#!/usr/bin/env tsx
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync } from "node:fs"

const IMAGE = process.env.METRICS_IMAGE ?? "ghcr.io/lowlighter/metrics:v3.34"
const RENDERS = process.env.METRICS_RENDERS ?? "/metrics_renders"
const MAX_ATTEMPTS = Number(process.env.METRICS_MAX_ATTEMPTS ?? "3")
const SVG = `${RENDERS}/github-metrics.svg`

const run = (cmd: string, args: string[]) =>
	execFileSync(cmd, args, { stdio: "inherit" })

try {
	mkdirSync(RENDERS, { recursive: true })
} catch {
	run("sudo", ["mkdir", "-p", RENDERS])
}
run("docker", ["pull", IMAGE])

// lowlighter/metrics expects URI-encoded INPUT_* values, plus the GHA runtime
// env vars it filters on. Replicates the .env construction in its action.yml.
const dockerArgs = [
	"run",
	"--init",
	"--rm",
	"--volume",
	`${process.env.GITHUB_EVENT_PATH}:${process.env.GITHUB_EVENT_PATH}`,
	"--volume",
	`${RENDERS}:/renders`,
]
for (const [key, value] of Object.entries(process.env)) {
	if (value === undefined) continue
	if (key.startsWith("INPUT_"))
		dockerArgs.push("--env", `${key}=${encodeURIComponent(value)}`)
	else if (/^(GITHUB|ACTIONS|CI|TZ)/.test(key))
		dockerArgs.push("--env", `${key}=${value}`)
}
dockerArgs.push(IMAGE)

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
	console.log(`::group::Metrics attempt ${attempt}`)
	run("docker", dockerArgs)
	console.log("::endgroup::")

	const svg = readFileSync(SVG, "utf8")
	if (svg.includes('id="languages-bar"')) {
		console.log(`Metrics valid on attempt ${attempt}`)
		process.exit(0)
	}
	console.log(`::warning::Metrics attempt ${attempt} missing language bars`)
}

console.error(`::error::Metrics failed validation after ${MAX_ATTEMPTS} attempts`)
process.exit(1)
