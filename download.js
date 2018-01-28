#!/usr/bin/env node
const RutrackerApi = require('rutracker-api');

const fs = require('fs');
const util = require('util');
const read = (name, content) => util.promisify(fs.readFile)(name, 'utf8');
const write = (name, content) => util.promisify(fs.writeFile)(name, typeof content === 'string' ? content : JSON.stringify(content, null, '\t'), 'utf8');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec.bind(child_process));
const readJson = name => JSON.parse(fs.readFileSync(name, 'utf8'));

const ids = require('process').argv.slice(2);
const config = readJson('/home/pi/.config/rutracker-cli/config.json');
const mkdir = require('make-dir');
const defaultPathMode = 0o0700;

const rutracker = new RutrackerApi({
    username: config.username,
    password: config.password,
});

rutracker.on('login', () => {
  ids.forEach(id => download(id));
});

/*
[
  {
    state: 'проверено',
    id: 'XXXXXXXX'
    category: 'CATEGORY_NAME',
    title: 'TITLE',
    author: 'AUTHOR_NAME',
    size: '1.07 GB',
    seeds: '7123',
    leechs: '275',
    url: 'rutracker.org/forum/viewtopic.php?t=XXXXXX'
  }, ...
]
*/

function download (id) {
    const path = config.downloadPath;

    return new Promise((resolve, reject) => {
        rutracker.download(id, response => {
            const name = `rutracker.org.${id}.torrent`;
            const writable = fs.createWriteStream(`${path}/${name}`);

            response.on('error', err => {
                writable.close();
                reject(err);
            });

            writable.on('error', err => {
                // Create download directory if it doesn't exist
                // and retry piping
                if (err.code === 'ENOENT') {
                    mkdir.sync(path, defaultPathMode);
                    const _writable = fs.createWriteStream(`${path}/${name}`);
                    response.pipe(_writable);
                }

                if (err.code === 'EACCES') {
                    reject({ type: 'permission' });
                }
            });

            response.pipe(writable);

            response.on('end', () => {
                resolve();
								console.log('ok', `${path}/${name}`);
								exec(`scp ${path}/${name} pi@rpi3:~/Downloads`).then(() => console.log('sent to rpi3'));
            });
        });
    });
}
