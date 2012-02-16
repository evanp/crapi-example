// discovery for ACK
//
// Copyright 2012 StatusNet Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var http = require('http'),
    url = require('url'),
    qs = require('querystring'),
    crypto = require('crypto'),
    xml2js = require('xml2js'),
    _ = require('underscore');

var postRequest = function(targetUrl, params, callback) {

    var parts = url.parse(targetUrl);

    var options = {
        host: parts.hostname,
        port: parts.port,
        path: (parts.search) ? parts.pathname+'?'+parts.search : parts.pathname,
        method: 'POST',
        headers: {'content-type': 'application/x-www-form-urlencoded',
                  'user-agent': 'ack-example/0.1.0dev'}
    };

    var creq = http.request(options, function(res) {

        var body = '';

        res.on('data', function (chunk) {
            body = body + chunk;
        });

        res.on('end', function () {
            callback(null, res, body);
        });
    });

    creq.on('error', function(err) {
        callback(err, null, null);
    });

    creq.write(qs.stringify(params));
    creq.end();
};

var discoverRels = function(server, callback) {

    http.get({host: server; port: 80; path: '/.well-known/host-meta'}, function(res) {

        if (res.statusCode !== 200) {
            callback(new Error("HTTP Error: got status " + res.statusCode), null);
            return;
        }

        var body = '';

        res.on('data', function (chunk) {
            body = body + chunk;
        });

        res.on('end', function () {

            var parser = new xml2js.Parser();

            parser.parseString(body, function (err, doc) {
                var Link = null,
                    rels = {},
                    i;

                if (!doc.hasOwnProperty('Link')) {
                    callback(null, rels);
                    return;
                }

                if (_.isArray(doc.Link)) {
                    for (i in doc.Link) {
                        Link = doc.Link[i];
                        rels[Link['@'].rel] = Link['@'].href;
                    }
                } else {
                    Link = doc.Link;
                    rels[Link['@'].rel] = Link['@'].href;
                }

                callback(null, rels);
            });
        });

    }).on('error', function(err) {
        callback(err, null);
    }); 
};

var randomString = function(bytes, callback) {

    crypto.randomBytes(bytes, function(err, buf) {
        if (err) {
            callback(err, null);
            return;
        }

        var nonce = buf.toString('base64');

        nonce = nonce.replace(/\+/g, '-');
        nonce = nonce.replace(/\//g, '_');
        nonce = nonce.replace(/\=/g, '');
        
        callback(null, nonce);
    });
};

exports.discoverRels = discoverRels;
exports.randomString = randomString;
exports.postRequest = postRequest;
