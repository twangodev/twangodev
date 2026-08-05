const xUsername = 'twango';

export const site = {
	name: 'James Ding',
	url: 'https://twango.dev',
	title: 'James Ding',
	description: 'Second-year student at UW–Madison studying computer science.',
	author: {
		name: 'James Ding',
		url: 'https://twango.dev',
		github: 'https://github.com/twangodev',
		linkedin: 'https://linkedin.com/in/jamesding365',
		x: {
			username: xUsername,
			url: `https://x.com/${xUsername}`
		},
		lastfm: 'twangodev',
		email: 'james@twango.dev'
	},
	locale: 'en_US',
	language: 'en'
} as const;
