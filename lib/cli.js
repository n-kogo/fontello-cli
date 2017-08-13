'use strict';

var colors = require('colors');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var pjson = require(path.join(__dirname, '..', 'package.json'));
var program = require('commander');

var _require = require('util'),
    print = _require.print;

var fontello = require(path.join(__dirname, '..', 'lib', 'fontello'));

var dirIsValid = function dirIsValid(path) {
  try {
    return fs.statSync(path).isDirectory();
  } catch (e) {
    mkdirp.sync(path);
    return true;
  }
};

var config = 'config.json';

program.version(pjson.version).usage('[command] [options]').option('--config [path]', 'path to fontello config. defaults to ./config.json').option('--css [path]', 'path to css directory (optional). if provided, --font option is expected.').option('--font [path]', 'path to font directory (optional). if provided, --css option is expected.').option('--host [host]', 'address of fontello instance (optional).').option('--proxy [host]', 'address of the proxy you are behind.');

program.command('install').description('download fontello. without --css and --font flags, the full download is extracted.').action(function (env, options) {
  // Check if css and font directories were provided.
  // Create them if they do not exist.
  // Exit if they are not valid directories.
  //
  if (program.css && program.font) {
    if (!dirIsValid(program.css)) {
      print('--css path provided is not a directory.\n'.red);
      process.exit(1);
    }

    if (!dirIsValid(program.font)) {
      print('--font path provided is not a directory.\n'.red);
      process.exit(1);
    }
  }

  return fontello.install({
    config: program.config || config,
    css: program.css,
    font: program.font,
    host: program.host,
    proxy: program.proxy
  });
});

program.command('open').description('open the fontello website with your config file preloaded.').action(function (env, options) {
  return fontello.open({
    config: program.config || config,
    host: program.host,
    proxy: program.proxy
  });
});

program.parse(process.argv);