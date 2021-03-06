#!/usr/bin/env node

'use strict';
const fs = require('fs');
const path = require('path');
const url = require('url');

const yaml = require('js-yaml');
const fetch = require('node-fetch');

const converter = require('./index.js');

var argv = require('yargs')
    .usage('widdershins [options] {input-file|url} [[-o] output markdown]')
    .demand(1)
    .strict()
    .boolean('yaml')
    .alias('y','yaml')
    .describe('yaml','Load spec in yaml format, default json')
    .boolean('aggressive')
    .alias('a','aggressive')
    .describe('aggressive','Use alternative dereffing logic')
    .boolean('code')
    .alias('c','code')
    .describe('code','Turn generic code samples off')
    .string('includes')
    .boolean('discovery')
    .alias('d','discovery')
    .describe('discovery','Include schema.org WebAPI discovery data')
    .string('environment')
    .alias('e','environment')
    .describe('environment','Load config/override options from file')
    .number('headings')
    .describe('Levels of headings to expand in TOC')
    .default('headings','2')
    .alias('i','includes')
    .describe('includes','List of files to include, comma separated')
    .boolean('lang')
    .alias('l','lang')
    .describe('lang','Automatically generate list of languages for code samples')
    .boolean('noschema')
    .alias('n','noschema')
    .describe('noschema','Do not expand schema definitions')
    .string('outfile')
    .alias('o','outfile')
    .describe('outfile','File to write output markdown to')
    .boolean('raw')
    .alias('r','raw')
    .describe('raw','Output raw schemas not example values')
    .boolean('search')
    .alias('s','search')
    .default('search',true)
    .describe('search','Whether to enable search or not, default true')
    .boolean('summary')
    .describe('summary','Use summary instead of operationId for TOC')
    .string('theme')
    .alias('t','theme')
    .describe('theme','Syntax-highlighter theme to use')
    .string('user_templates')
    .alias('u','user_templates')
    .describe('user_templates','directory to load override templates from')
    .boolean('verbose')
    .describe('verbose','Increase verbosity')
    .help('h')
    .alias('h', 'help')
    .version()
    .argv;

var options = {};

function doit(s) {
    var api = {};
    try {
        api = yaml.safeLoad(s,{json:true});
    }
    catch(ex) {
        console.error('Failed to parse YAML/JSON, falling back to API Blueprint');
        console.error(ex.message);
        api = s;
    }

    converter.convert(api,options,function(err,output){
        var outfile = argv.outfile||argv._[1];
        if (outfile) {
            fs.writeFileSync(path.resolve(outfile),output,'utf8');
        }
        else {
            console.log(output);
        }
    });
}

options.codeSamples = !argv.code;
if (argv.lang) {
    options.language_tabs = [];
}
if (argv.theme) options.theme = argv.theme;
options.user_templates = argv.user_templates;
options.inline = argv.inline;
options.sample = !argv.raw;
options.discovery = argv.discovery;
options.aggressive = argv.aggressive;
options.verbose = argv.verbose;
options.tocSummary = argv.summary;
options.headings = argv.headings;
if (argv.search === false) options.search = false;
if (argv.includes) options.includes = argv.includes.split(',');
if (argv.noschema) options.schema = false;

if (argv.environment) {
    var e = fs.readFileSync(path.resolve(argv.environment),'utf8');
    var env = {};
    try {
        env = yaml.safeLoad(e,{json:true});
    }
    catch (ex) {
        console.error(ex.message);
    }
    options = Object.assign({},options,env);
}

var input = argv._[0];
var up = url.parse(input);
if (up.protocol && up.protocol.startsWith('http')) {
    fetch(input)
    .then(function (res) {
        return res.text();
    }).then(function (body) {
        doit(body);
    }).catch(function (err) {
        console.error(err.message);
    });
}
else {
    let s = fs.readFileSync(input,'utf8');
    doit(s);
}

