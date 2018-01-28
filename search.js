#!/usr/bin/env node
const RutrackerApi = require('rutracker-api');

const avg = (a, b) => ( a + b ) / 2;
const args = require('process').argv.slice(2);
const query = (args.includes('--') ? args.slice(0, args.indexOf('--') ) : args).join(' ');
const cat = args.includes('--') ? (args[args.indexOf('--') + 1] || '') : '';
const readJson = name => JSON.parse(require('fs').readFileSync(name, 'utf8'));
const login = readJson('/home/pi/.config/rutracker-cli/config.json');

const rutracker = new RutrackerApi({
    username: login.username,
    password: login.password,
});

rutracker.on('login', () => {
  rutracker.search(query, onSearch);
});

/*
[
  {
    state: 'проверено',
    id: 'XXXXXXXX'
    category: 'CATEGORY_NAME',
    title: 'TITLE',
    author: 'AUTHOR_NAME',
    size_h: '1.07 GB',
		size_b: 1073741824,
    seeds: '7123',
    leechs: '275',
    url: 'rutracker.org/forum/viewtopic.php?t=XXXXXX'
  }, ...
]
*/

const GB = 1024*1024*1024;

function onSearch (res = []) {
	console.error('Search', res.length);
	const filtered = (cat
		? res.filter(i => i.category.toLowerCase().includes(cat.toLowerCase()))
		: res.filter(i => i.category.toLowerCase().includes('сериал') || i.category.toLowerCase().includes('фильм')))
		.filter(i => i.category.length < 60)
		.filter(i => i.size_b >= GB && i.size_b <= GB * 50)
		.filter(i => !i.category.includes('iPad') && !i.category.includes('PSP'))
		.slice(0, 10);
	const maxSize = filtered.reduce((max, i) => Math.max(max, i.size_b), 0);
	const maxSeeds = filtered.reduce((max, i) => Math.max(max, i.seeds), 0);
	const sorted = filtered
		.sort((a, b) => {
			const factorA = .4 * a.size_b / maxSize + .6 * a.seeds / maxSeeds;
			const factorB = .4 * b.size_b / maxSize + .6 * b.seeds / maxSeeds;
			return factorA - factorB;
		});

	console.log(JSON.stringify(sorted, null, 4));
}
