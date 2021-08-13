/**
 * @module NpmTemplate
 * Copyright 2020 by Bob Kerns. Licensed under MIT license.
 */

/**
 * A largely self-configuring rollup configuration.
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import {terser} from 'rollup-plugin-terser';
import visualizerNoName, {VisualizerOptions} from 'rollup-plugin-visualizer';
import {OutputOptions, RollupOptions} from "rollup";
import {chain as flatMap} from 'ramda';
import {join, dirname, basename, extname, relative} from 'path';
import serve from 'rollup-plugin-serve';

const SERVE_PORT = Number.parseInt(process.env.SERVE_PORT ?? '5555');

/**
 * The visualizer plugin fails to set the plugin name. We wrap it to remedy that.
 * @param opts
 */
const visualizer = (opts?: Partial<VisualizerOptions>) => {
    const noname: Partial<Plugin> = visualizerNoName(opts);
    return {
        name: "Visualizer",
        ...noname
    };
}

const mode = process.env.NODE_ENV;
// noinspection JSUnusedLocalSymbols
const dev = mode === 'development';
const serve_mode = process.env.SERVE && dev;
const serve_doc = process.env.SERVE_DOC && serve_mode;

/**
 * Avoid non-support of ?. optional chaining.
 */
const DISABLE_TERSER = false;

/**
 * A rough description of the contents of [[package.json]].
 */
interface Package {
    name: string;
    main?: string;
    module?: string;
    browser?: string;
    [K: string]: any;
}
const pkg: Package  = require('../package.json');


const globals: {[k: string]: string} = {
};

/**
 * Compute the list of outputs from [[package.json]]'s fields
 * @param p the [[package.json]] declaration
 */
export const outputs = (p: Package) => (s: string, n: string) => {
    const dest = (f: string) =>
        join(dirname(f), basename(s, extname(s)) + extname(f));
    return flatMap((e: OutputOptions) => (e.file ? [e] : []),
        [
            {
                file: dest(p.browser!),
                name: n,
                format: 'umd',
                sourcemap: true,
                globals
            },
            {
                format: 'cjs',
                file: dest(p.main!),
                sourcemap: true
            },
            {
                format: 'esm',
                file: dest(p.module!),
                sourcemap: true
            }
        ]) as OutputOptions;
};

/**
 * Compute the set of main entrypoints from [[package.json]].
 * @param p The contents of [[package.json]]
 * @param entries A array of keys to check for entry points in [[package.json]].
 */
const mainFields = (p: Package, entries: string[]) =>
    flatMap((f: string) => (pkg[f] ? [f] : []) as ReadonlyArray<string>,
        entries);

/**
 * A useful little plugin to trace some of the behavior of rollup.
 */
const dbg: any = {name: 'dbg'};
['resolveId', 'load', 'transform', 'generateBundle', 'writeBundle'].forEach(
    f => dbg[f] = function (...args: any[]) {
        this.warn(`${f}: ${args.map((a: any) => JSON.stringify(a, null, 2)).join(', ')}`);
        return null;}
);

const globalsChecked: {[k:string]: string | false} = {};

/**
 * Check for modules that should be considered external and not bundled directly.
 * By default, we consider those from node_modules to be external,
 * @param id
 * @param from
 * @param resolved
 */
const checkExternal = (id: string, from?: string, resolved?: boolean): boolean =>
    {
        const isExternal = !/denque|src\/.*[.]ts$/.test(id) && (resolved
            ? /\/node_modules\//.test(id)
            : !/^\./.test(id));
        const ext = globals[id] ?? '(missing)';
        if (globalsChecked[id] === undefined) {
            if (isExternal) {
                process.stderr.write(`External: ${id} => as ${ext}\n`);
            } else {
                process.stderr.write(`Embedded: ${relative(process.cwd(), id)}\n`);
            }
        }
        globalsChecked[id] = ext;
        return isExternal;
    }

let once = 0;

const options: (src: string, name: string) => RollupOptions = (src, name) => ({
    input: src,
    output: outputs(pkg)(src, name),
    external: checkExternal,
    plugins: [
        resolve({
            // Check for these in package.json
            mainFields: mainFields(pkg, ['module', 'main', 'browser']),
        }),
        typescript({
            tsconfig: 'src/tsconfig.json',
            include: "**/*.ts",
            verbosity: 1,
            cacheRoot: "./build/rts2-cache",
            // false = Put the declaration files into the regular output in lib/
            useTsconfigDeclarationDir: false,
            tsconfigOverride: {
                "tsBuildInfoFile": `../build/tsbuild-info-${basename(src, ".d.ts")}`,
            }
         }),
        commonjs({
            extensions: [".js", ".ts"]
        }),
        ...(!dev && !DISABLE_TERSER) ? [
            terser({
            module: true
        })
        ] : [],
        visualizer({
            filename: "build/build-stats.html",
            title: "Build Stats"
        }),
        ...serve_mode && once++ === 0 ? [
            serve({
                open: !!serve_doc,
                verbose: true,
                port: SERVE_PORT,
                contentBase: '',
                openPage: '/build/docs/api/index.html'
            })
        ] : []
    ]
});

// noinspection JSUnusedGlobalSymbols
export default [
    options('./src/index.ts', 'genutils'),
    options('./src/functions.ts', 'functions'),
    options('./src/range.ts', 'range'),
    options('./src/enhancements.ts', 'enhancements'),
    options('./src/async.ts', 'async'),
    options('./src/sync.ts', 'sync'),
    options('./src/generators.ts', 'generators'),
    options('./src/events.ts', 'events'),
    options('./src/future.ts', 'future')
    ];