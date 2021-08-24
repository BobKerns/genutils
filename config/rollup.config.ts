/**
 * @module NpmTemplate
 * Copyright 2020 by Bob Kerns. Licensed under MIT license.
 */

/**
 * A largely self-configuring rollup configuration.
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import {terser} from 'rollup-plugin-terser';
import visualizerNoName, {VisualizerOptions} from 'rollup-plugin-visualizer';
import {OutputOptions, RollupOptions} from "rollup";
import {chain as flatMap} from 'ramda';
import {join, dirname, basename, extname, relative} from 'path';

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
        const isExternal = !/denque|\/build\/src\/.*[.]js$/.test(id) && (resolved
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
        commonjs({
            extensions: [".js", ".ts"]
        }),
        ...(!dev && !DISABLE_TERSER) ? [
            terser({
            module: true
        })
        ] : [],
        visualizer({
            filename: `build/build-stats-${name}.html`,
            title: "Build Stats"
        })
    ]
});

// noinspection JSUnusedGlobalSymbols
export default [
    options('./build/src/index.js', 'genutils'),
    options('./build/src/functions.js', 'functions'),
    options('./build/src/range.js', 'range'),
    options('./build/src/enhancements.js', 'enhancements'),
    options('./build/src/async.js', 'async'),
    options('./build/src/sync.js', 'sync'),
    options('./build/src/generators.js', 'generators'),
    options('./build/src/events.js', 'events'),
    options('./build/src/future.js', 'future')
    ];