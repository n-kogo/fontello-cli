const fs = require('fs');
const needle = require('needle');
const open = require('open');
const {print} = require('util');
const path = require('path');
const unzip = require('unzip');


const HOST = 'http://fontello.com';

const getSession = function(options, requestOptions, successCallback, errorCallback) {
  print('Creating a new session'.green);
  const data = {
    config: {
      file: options.config,
      content_type: 'application/json'
    }
  };

  return needle.post(options.host, data, requestOptions, function(error, response, body) {
    if (error) { throw error; }
    const sessionId = body;

    if (response.statusCode === 200) {
      fs.writeFile('.fontello-session', sessionId, function(err) {
          if (!err) {
            return print('Session was saved as .fontello-session \n'.green);
          } else {
            return print(err + "\n");
          }
      });
      const sessionUrl = `${options.host}/${sessionId}`;
      return (typeof successCallback === 'function' ? successCallback(sessionUrl) : undefined);
    } else {
      return (typeof errorCallback === 'function' ? errorCallback(response) : undefined);
    }
  });
};

const apiRequest = function(options, successCallback, errorCallback) {
  if (options.host == null) { options.host = HOST; }

  const requestOptions = { multipart: true };
  if (options.proxy != null) { requestOptions.proxy = options.proxy; }
  if (fs.existsSync(".fontello-session")) {
    const stats = fs.statSync(".fontello-session");

    const timeDiff = Math.abs(new Date().getTime() - stats.mtime.getTime());

    if (timeDiff < (1000 * 3600 * 24)) {
      print('Using .fontello-session'.green);
      const sessionId = fs.readFileSync('.fontello-session');
      const sessionUrl = `${options.host}/${sessionId}`;
      return (typeof successCallback === 'function' ? successCallback(sessionUrl) : undefined);
    }
  }


  return getSession(options, requestOptions, successCallback, errorCallback);
};



const fontello = {

  install(options) {

    // Begin the download
    //
    return apiRequest(options, function(sessionUrl) {
      const requestOptions = {};
      if (options.proxy != null) { requestOptions.proxy = options.proxy; }

      const zipFile = needle.get(`${sessionUrl}/get`, requestOptions, function(error, response, body) {
        if (error) { throw error; }
      });

      // If css and font directories were provided, extract the contents of
      // the download to those directories. If not, extract the zip file as normal.
      //
      if (options.css && options.font) {
        return zipFile
          .pipe(unzip.Parse())
          .on('entry', (function(entry) {
            const {path:pathName, type} = entry;

            if (type === 'File') {
              const dirName = __guard__(path.dirname(pathName).match(/\/([^\/]*)$/), x => x[1]);
              const fileName = path.basename(pathName);

              switch (dirName) {
                case 'css':
                  const cssPath = path.join(options.css, fileName);
                  return entry.pipe(fs.createWriteStream(cssPath));
                case 'font':
                  const fontPath = path.join(options.font, fileName);
                  return entry.pipe(fs.createWriteStream(fontPath));
                default:
                  return entry.autodrain();
              }
            }
          }))
          .on('finish', (() => print('Install complete.\n'.green)));

      } else {
        return zipFile
          .pipe(unzip.Extract({ path: '.' }))
          .on('finish', (() => print('Install complete.\n'.green)));
      }
    });
  },


  open(options) {
    return apiRequest(options, sessionUrl => open(sessionUrl));
  }
};


module.exports = fontello;
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}