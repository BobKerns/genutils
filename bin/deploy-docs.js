#!/usr/bin/env node
/*
 * @module physics-math
 * Copyright 2020 by Bob Kerns. Licensed under MIT license.
 *
 * Github: https://github.com/BobKerns/genutils
 */

/*
 * This file handles documentation releases. In the context of a github release workflow,
 * it expects the gh-pages branch to be checked out into build/docdest. The generated API
 * documentation will be installed into build/docdest/docs/{tag}/api, and the site glue
 * will be updated with appropriate links.
 *
 * We do a bit of shuffling:
 * * The project CHANGELOG.md is at the global (top) in the target.
 * * The project README.md is versioned to each release tag, and the most
 *   recent one is also put at top level.
 *
 * They are converted to HTML, and links adjusted accordingly.
 *
 * The observablehq/ directory is copied to the release tag, and its README.md
 * is translated to HTML.
 */

import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const github = process.env['GITHUB_WORKSPACE'];
const PROJECT = 'genutils';

const VERSION = pkg.version;
const TAG = github ? `v${VERSION}` : 'local';

console.log(`Deploying ${PROJECT} ${VERSION} as ${TAG}`);

import * as fs from 'fs/promises';
const copyFile = fs.copyFile;
const readdir = fs.readdir;
const mkdir = async d => {
    try {
        await fs.mkdir(d);
        console.log(`Created: ${d}`);
    } catch (e) {
        if (e.code === 'EEXIST') {
            // already exists.
            console.log(`Exists: ${d}`)
        } else {
            throw e;
        }
    }
    return d;
}
const readFile = async f => fs.readFile(f, 'utf8');
const writeFile = async (f, data) => fs.writeFile(f, data, 'utf8');


import { join, resolve, dirname, basename } from 'path';
import * as child_process from 'child_process';
import { promisify } from 'util';
import hljs from 'highlight.js';
import fetch from 'node-fetch';


const execFile = promisify(child_process.execFile);

/**
 * The root of our repo
 * @type {string}
 */
const ROOT = join(import.meta.url, '../..').replace(/^file:/, '');

// In the workflow, point this to where we checked out the gh-pages branch.
const DOCS =
    github
        ? join(github, 'build/docdest')
        : ROOT;

const SITEBASE =
    github
        ? `/${PROJECT}`
        : '/';

const DOCBASE = `${SITEBASE}/docs`

import {marked} from 'marked';

marked.setOptions({
    renderer: new marked.Renderer(),
    highlight: function(code, languageName) {
        const language = hljs.getLanguage(languageName) ? languageName : 'plaintext';
        return hljs.highlight(code, {language}).value;
    },
    gfm: true,
});
const renderer = {
    link(href, title, text) {
        const rewrite = () => {
            if (href.match(/(?:\.\/)?README.md$/)) {
                return `${DOCBASE}/${TAG}/README.html`;
            } else if (href.match(/(?:\.\/)?CHANGELOG.md$/)) {
                return `${DOCBASE}/CHANGELOG.html`;
            }
            return href.replace(/\.md$/i, '.html');
        };
        const nHref = rewrite(href);
        console.log('link', href, title, text, nHref);
        return`<a href=${nHref} ${title ? `title="${title}"` : ''}>${text}</a>`;
    }
};

marked.use({renderer });

const exec = async (cmd, ...args) => {
    const {stdout, stderr} = await execFile(cmd, args, {cwd: DOCS});
    stderr && process.stderr.write(stderr);
    stdout && process.stdout.write(stdout);
};

const copy = async (from, to) => {
    const dir = dirname(to);
    await mkdir(dir);
    await copyFile(from, to);
}


const html = (title, body) => `<!DOCTYPE html>
<html>
<head>
<title>${title}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/xcode.min.css" integrity="sha512-hDoXdEZ9LKsZWAWm3LMIeAJT///uSvllP7dCOB4lV/cfSb/sv1yhT+q6ORYKubs1keK/w08GKTrYB0UU8dzhvw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
</head>
<body>${body}</body>
</html>`;

const convert = async (from, to, title) => {
    console.log('Converting', from, to);
    const dir = dirname(to);
    const fname = basename(to).replace(/\.md$/i, '.html');
    const htmlFile = join(dir, fname);
    await mkdir(dir);
    const content = await readFile(from);
    return await convertContent(content, htmlFile, title);
};

const convertContent = async (content, htmlFile, title) => {
    const extractTitle = () => {
        const t1 = content.match(/^# (.*)$/m);
        return t1 ? t1[1] : basename(htmlFile, '.html');
    }
    title = title || extractTitle();
    const dir = dirname(htmlFile);
    await mkdir(dir);
    const xFormed = marked(content);
    console.log(`Writing: ${htmlFile} (${title})`);
    await writeFile(htmlFile, html(title, xFormed));
    return htmlFile;
};

const releaseList = async () => {
    const url = `https://api.github.com/repos/BobKerns/${PROJECT}/releases`;
    console.log(`Fetching releases from ${url}`)
    const releases = await (await fetch(url)).json();
    return releases.filter(e => e.published_at > '2020-05-29T18:25:38Z');
}

const formatReleases = (releases) =>
    releases
        .map(r => `* [${r.name}](https://bobkerns.github.io/${PROJECT}/doc${PROJECT}s/${r.tag_name}/api/index.html) ${r.prerelease ? ' (prerelease)' : ''}`)
        .join('\n');

const Throw = m => {
    throw new Error(m);
};

const thisRelease = (tag, releases) =>
    github ?
        releases
            .filter(e => e.tag_name === tag)
            [0] || Throw(`No release tagged ${tag} found.`)
        : {name: 'Local Build', body: 'Local build'} // fake release

const run = async () => {
    const source = join(ROOT, 'build', 'docs');
    const docs = join(DOCS, 'docs');
    const target = join(docs, TAG);

    process.stdout.write(`GITHUB_WORKSPACE: ${github}\n`);
    process.stdout.write(`ROOT: ${ROOT}\n`);
    process.stdout.write(`DOCS: ${DOCS}\n`);
    process.stdout.write(`docs: ${docs}\n`);
    process.stdout.write(`Destination: ${target}\n`);
    await mkdir(DOCS);
    await mkdir(docs);
    await mkdir(target);
    await Promise.all([
        ['CHANGELOG.md', 'Change Log'],
        ['README.md', `GenUtils`]
    ].map(([f, title, f2]) =>
        convert(join(ROOT, f), f2 || join(docs, f), title)));
    const releases = await releaseList();
    const release_body = formatReleases(releases);
    const release_page = `# Generator Utility (genutils) release documentation
${!github ? `* [local](http://localhost:5000/docs/local/index.html)` : ``}
* [CHANGELOG](./CHANGELOG.html)
${release_body}`;
    await convertContent(release_page, join(docs, 'index.html'), "Generator Utility Releases");
    const release = thisRelease(TAG, releases);
    const release_landing = `# ${release.name}
    ${release.body || ''}

* [API documentation](api/index.html)
* [CHANGELOG](../CHANGELOG.html)
* [GitHub](https://github.com/BobKerns/${PROJECT}.git)
* [GitHub ${TAG} tree](https://github.com/BobKerns/${PROJECT}.git/tree/${TAG}/)
`;
    await convertContent(release_landing, join(target, 'index.html'), release.name);
    const copyTree = async (from, to) => {
        const dir = await readdir(resolve(ROOT, from), {withFileTypes: true});
        return  Promise.all(dir.map(d =>
            d.isFile()
                ? d.name.endsWith('.md')
                ? convert(join(from, d.name), join(to, d.name.replace(/\.md$/, '.html')))
                : copyFile(join(from, d.name), join(to, d.name))
                : d.isDirectory()
                ? Promise.resolve(join(to, d.name))
                    .then(mkdir)
                    .then(t => copyTree(join(from, d.name), t))
                : Promise.resolve(null)));
    }
    await copyTree(source, target);
    // Only check in as part of the packaging workflow.
    if (github) {
        await exec('git', 'config', 'user.email', '1154903+BobKerns@users.noreply.github.com');
        await exec('git', 'config', 'user.name', 'ReleaseBot');
        await exec('git', 'add', target);
        await exec('git', 'add', 'docs/');
        await exec('git', 'status');
        await exec('git', 'commit', '-m', `Deploy documentation for ${TAG}.`);
        await exec('git', 'push');
    }
}
run().catch(e => {
    process.stderr.write(`Error: ${e.message}\n${e.stack}`);
    process.exit(-128);
});
