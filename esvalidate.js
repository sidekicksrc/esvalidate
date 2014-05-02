/*global log:true esprima:true fs:true */

var options, fnames, count, formatter, dieLoudly, formatter;

function tryGet(searchPaths) {
  'use strict';

  var valueToGet = null,
      path = null;

  for(var i = 0; i < searchPaths.length; i++) {
    path = searchPaths[i];
    if(fs.existsSync(path)) {
      valueToGet = require(path);
      break;
    }
  }
  return valueToGet;
}

function showUsage() {
  'use strict';
  log('Usage:');
  log('   esvalidate [options] file.js');
  log();
  log('Available options:');
  log();
  log('  --format=type  Set the report format, plain (default) or junit');
  log('  --formatter=file  Path to a formatter.js file');
  log('  -v, --version  Print program version');
  log('  -q, --quiet    If an error occurs during parsing, do not return an error code');
  log();
  process.exit(1);
}

if (process.argv.length <= 2) {
  showUsage();
}

options = {
  format: 'plain'
};

fnames = [];
dieLoudly = true;

process.argv.splice(2).forEach(function (entry) {
  'use strict';

  if (entry === '-h' || entry === '--help') {
    showUsage();
  } else if (entry === '-v' || entry === '--version') {
    log('ECMAScript Validator (using Esprima version', esprima.version, ')');
    log();
    process.exit(0);
  } else if (entry === '-q' || entry === '--quiet') {
    dieLoudly = false;
  } else if (entry.slice(0, 9) === '--format=') {
    options.format = entry.slice(9);
  } else if (entry.slice(0, 12) === '--formatter=') {
    options.format = entry.slice(12);
  } else if (entry.slice(0, 2) === '--') {
    log('Error: unknown option ' + entry + '.');
    process.exit(1);
  } else {
    fnames.push(entry);
  }
});

if (options.format.slice(options.format.length - 3).toLowerCase() !== '.js') {
  options.format = options.format + '.js';
}

var cwd = process.cwd();
var searchPaths = ['../formats/' + options.format, cwd + '/' + options.format];
var tempFormatter = tryGet(searchPaths);

if (!formatter && tempFormatter) {
  formatter = tempFormatter;
}

if (!formatter) {
  log('Error: unknown report format ' + options.format + ', searched: ' + searchPaths.join(', '));
  process.exit(1);
} else {
  formatter = formatter(log);
}

if (fnames.length === 0) {
  log('Error: no input file.');
  process.exit(1);
}

formatter.startLog();

count = 0;
fnames.forEach(function (fname) {
  'use strict';
  var content, timestamp, syntax, name, errors, failures, tests, time;

  timestamp = Date.now();

  try {
    content = fs.readFileSync(fname, 'utf-8');

    if (content[0] === '#' && content[1] === '!') {
      content = '//' + content.substr(2, content.length);
    }

    syntax = esprima.parse(content, { tolerant: true });

    name = fname;
    if (name.lastIndexOf('/') >= 0) {
      name = name.slice(name.lastIndexOf('/') + 1);
    }

    errors = 0;
    failures = syntax.errors.length;
    tests =  syntax.errors.length;
    time = Math.round((Date.now() - timestamp) / 1000);

    formatter.startSection(name, errors, failures, tests, time);

    syntax.errors.forEach(function (error) {
      formatter.writeError(name, error, "SyntaxError");
      ++count;
    });

    formatter.endSection();

  } catch (e) {
    ++count;

    errors = 1;
    failures = 0;
    tests = 1;
    time = Math.round((Date.now() - timestamp) / 1000);

    formatter.startSection(fname, errors, failures, tests, time);
    formatter.writeError(fname, e, "ParseError");
    formatter.endSection();
  }
});

formatter.endLog();

if ((count > 0) && dieLoudly) {
  process.exit(1);
}

if (count === 0 && typeof phantom === 'object') {
  process.exit(0);
}
