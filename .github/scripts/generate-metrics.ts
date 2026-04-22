#!/usr/bin/env tsx
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync } from "node:fs"

const IMAGE = process.env.METRICS_IMAGE ?? "ghcr.io/lowlighter/metrics:v3.34"
const RENDERS = process.env.METRICS_RENDERS ?? "/metrics_renders"
const MAX_ATTEMPTS = Number(process.env.METRICS_MAX_ATTEMPTS ?? "3")
const ACTION_REF = process.env.METRICS_ACTION_REF ?? "v3.34"
const SVG = `${RENDERS}/github-metrics.svg`

const run = (cmd: string, args: string[]) =>
	execFileSync(cmd, args, { stdio: "inherit" })

try {
	mkdirSync(RENDERS, { recursive: true })
} catch {
	run("sudo", ["mkdir", "-p", RENDERS])
}
run("docker", ["pull", IMAGE])

// lowlighter/metrics's boolean parser returns `defaulted` as-is when the input
// is an empty string, and `default: no` in its metadata.yml is loaded as the
// *string* "no" by js-yaml 4 (truthy). The official action sidesteps this by
// passing the literal sentinel "<default-value>" for unspecified inputs, which
// routes through a separate code path that re-runs the regex. We mirror that
// by defaulting every action input we don't set.
const actionYml = await fetch(
	`https://raw.githubusercontent.com/lowlighter/metrics/${ACTION_REF}/action.yml`,
).then((r) => r.text())
const inputKeys = [...actionYml.matchAll(/^  ([a-z_]+):\s*$/gm)].map(
	([, k]) => k,
)

const dockerArgs = [
	"run",
	"--init",
	"--rm",
	"--volume",
	`${process.env.GITHUB_EVENT_PATH}:${process.env.GITHUB_EVENT_PATH}`,
	"--volume",
	`${RENDERS}:/renders`,
]
const passed = new Set<string>()
for (const [key, value] of Object.entries(process.env)) {
	if (value === undefined) continue
	if (key.startsWith("INPUT_")) {
		dockerArgs.push("--env", `${key}=${encodeURIComponent(value)}`)
		passed.add(key)
	} else if (/^(GITHUB|ACTIONS|CI|TZ)/.test(key))
		dockerArgs.push("--env", `${key}=${value}`)
}
for (const key of inputKeys) {
	const envKey = `INPUT_${key.toUpperCase()}`
	if (!passed.has(envKey))
		dockerArgs.push("--env", `${envKey}=${encodeURIComponent("<default-value>")}`)
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
