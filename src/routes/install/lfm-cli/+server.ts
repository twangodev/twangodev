export const prerender = true;

const SOURCE = 'https://raw.githubusercontent.com/twangodev/lfm-cli/main/install.sh';

export const GET = async () => {
	const res = await fetch(SOURCE);
	if (!res.ok) {
		throw new Error(`failed to fetch install.sh: ${res.status}`);
	}
	const script = await res.text();

	return new Response(script);
};
