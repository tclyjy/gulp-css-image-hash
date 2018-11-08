'use strict';

var through = require('through2'),
    async = require('async'),
    fs = require('fs'),
    crypto = require('crypto'),

var PLUGIN_NAME = 'gulp-css-image-hash';

function cssImageHash() {
    var stream = through.obj(function (file, enc, cb) {
        var that = this;
        var regex = /url\(([^\)]+)\)/g
        var matches = null
        var asString = '';
        var filePath = path.dirname(file.path);

        if (file.isBuffer()) {
            asString = String(file.contents);
            matches = asString.match(regex);
        }
        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
            return cb();
        }

        if (matches != null && matches.length) {
            var pairs = [];
            matches = matches.forEach(function (curValue) {
                var path = curValue.slice(4).slice(0, -1);
                if (path[0] == '"' || path[0] == "'") {
                    path = path.slice(1).slice(0, -1);
                }
                pairs.push([curValue, path]);
            });

            async.eachSeries(pairs, function (tuple, callback) {

                var imgPath = tuple[1];

                if (imgPath.substr(0, 4) == 'data') {
                    return callback();
                }

                if (!imgPath) {
                    return callback();
                }

                var md5 = crypto.createHash('md5')
                var hash = '';
                var file = fs.ReadStream(path.join(filePath, imgPath))

                file.on('data', function (d) {
                    md5.update(d);
                });

                file.on('end', function () {
                    hash = md5.digest('hex');
                    asString = asString.replace(tuple[0], 'url(' + tuple[1] + '?h=' + hash + ')');
                    callback();
                });

                file.on('error', function (error) {
                    callback();
                });
            }, function (err) {
                file.contents = new Buffer(asString);
                that.push(file);
                cb();
            });
        } else {
            this.push(file);
            cb();
        }
    })

    return stream;
}

module.exports = cssImageHash;
