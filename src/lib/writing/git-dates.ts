import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

type GitExec = typeof execFileSync;

export function getLatestPostGitTimestamp(
	repositoryRoot: string,
	postPath: string,
	exec: GitExec = execFileSync
): string | undefined {
	try {
		const timestamp = exec('git', ['log', '-1', '--follow', '--format=%aI', '--', postPath], {
			cwd: repositoryRoot,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();

		return timestamp || undefined;
	} catch {
		return undefined;
	}
}

export function getPostGitDates(
	repositoryRoot: string,
	contentDirectory = 'src/content/writing'
): Record<string, string> {
	const absoluteContentDirectory = resolve(repositoryRoot, contentDirectory);
	const postPaths = readdirSync(absoluteContentDirectory)
		.filter((name) => name.endsWith('.svx'))
		.map((name) =>
			relative(repositoryRoot, resolve(absoluteContentDirectory, name)).split(sep).join('/')
		);

	return Object.fromEntries(
		postPaths.flatMap((postPath) => {
			const timestamp = getLatestPostGitTimestamp(repositoryRoot, postPath);
			return timestamp ? [[postPath.replace(/^.*\//, '').replace(/\.svx$/, ''), timestamp]] : [];
		})
	);
}
