'use strict';

var fs = require('fs');
var needle = require('needle');
var _open = require('open');

var _require = require('util'),
    print = _require.print;

var path = require('path');
var unzip = require('unzip');

var HOST = 'http://fontello.com';

var getSession = function getSession(options, requestOptions, successCallback, errorCallback) {
  print('Creating a new session'.green);
  var data = {
    config: {
      file: options.config,
      content_type: 'application/json'
    }
  };

  return needle.post(options.host, data, requestOptions, function (error, response, body) {
    if (error) {
      throw error;
    }
    var sessionId = body;

    if (response.statusCode === 200) {
      fs.writeFile('.fontello-session', sessionId, function (err) {
        if (!err) {
          return print('Session was saved as .fontello-session \n'.green);
        } else {
          return print(err + "\n");
        }
      });
      var sessionUrl = options.host + '/' + sessionId;
      return typeof successCallback === 'function' ? successCallback(sessionUrl) : undefined;
    } else {
      return typeof errorCallback === 'function' ? errorCallback(response) : undefined;
    }
  });
};

var apiRequest = function apiRequest(options, successCallback, errorCallback) {
  if (options.host == null) {
    options.host = HOST;
  }

  var requestOptions = { multipart: true };
  if (options.proxy != null) {
    requestOptions.proxy = options.proxy;
  }
  if (fs.existsSync(".fontello-session")) {
    var stats = fs.statSync(".fontello-session");

    var timeDiff = Math.abs(new Date().getTime() - stats.mtime.getTime());

    if (timeDiff < 1000 * 3600 * 24) {
      print('Using .fontello-session'.green);
      var sessionId = fs.readFileSync('.fontello-session');
      var sessionUrl = options.host + '/' + sessionId;
      return typeof successCallback === 'function' ? successCallback(sessionUrl) : undefined;
    }
  }

  return getSession(options, requestOptions, successCallback, errorCallback);
};

var fontello = {
  install: function install(options) {

    // Begin the download
    //
    return apiRequest(options, function (sessionUrl) {
      var requestOptions = {};
      if (options.proxy != null) {
        requestOptions.proxy = options.proxy;
      }

      var zipFile = needle.get(sessionUrl + '/get', requestOptions, function (error, response, body) {
        if (error) {
          throw error;
        }
      });

      // If css and font directories were provided, extract the contents of
      // the download to those directories. If not, extract the zip file as normal.
      //
      if (options.css && options.font) {
        return zipFile.pipe(unzip.Parse()).on('entry', function (entry) {
          var pathName = entry.path,
              type = entry.type;


          if (type === 'File') {
            var dirName = __guard__(path.dirname(pathName).match(/\/([^\/]*)$/), function (x) {
              return x[1];
            });
            var fileName = path.basename(pathName);

            switch (dirName) {
              case 'css':
                var cssPath = path.join(options.css, fileName);
                return entry.pipe(fs.createWriteStream(cssPath));
              case 'font':
                var fontPath = path.join(options.font, fileName);
                return entry.pipe(fs.createWriteStream(fontPath));
              default:
                return entry.autodrain();
            }
          }
        }).on('finish', function () {
          return print('Install complete.\n'.green);
        });
      } else {
        return zipFile.pipe(unzip.Extract({ path: '.' })).on('finish', function () {
          return print('Install complete.\n'.green);
        });
      }
    });
  },
  open: function open(options) {
    return apiRequest(options, function (sessionUrl) {
      return _open(sessionUrl);
    });
  }
};

module.exports = fontello;
function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}