// server for ACK
//
// Copyright 2011, 2012 StatusNet Inc.
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

var connect = require('connect'),
    commonutils = require('./commonutils'),
    discoverRels = commonutils.discoverRels,
    postRequest = commonutils.postRequest,
    randomString = commonutils.randomString,
    os = require('os'),
    url = require('url'),
    http = require('http'),
    qs = require('querystring'),
    crypto = require('crypto'),
    config = require('./config');

var hostname = config.hostname;

if (!hostname) {
    hostname = os.hostname();
}

var credentials = {};

var makeNewCredentials = function(client, callback) {
    randomString(16, function(err, identifier) {
        if (err) {
            callback(err, null, null);
        } else {
            randomString(32, function(err, sharedSecret) {
                if (err) {
                    callback(err, null, null);
                } else {
                    credentials[identifier] = {
                        client: client,
                        sharedSecret: sharedSecret
                    };
                    callback(null, identifier, sharedSecret);
                }
            });
        }
    });
};

var unimplemented = function(req, res) {
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Unimplemented (yet)');
};

var giveMeAKey = function(req, res) {

    var client = req.query.ack_client,
        nonce = req.query.ack_nonce,
        showError = function(code, message) {
            res.writeHead(code, {'Content-Type': 'text/plain'});
            res.end(message);
        },
        showSuccess = function(results) {
            res.writeHead(200, {'Content-Type': 'application/x-www-form-urlencoded'});
            res.end(qs.stringify(results));
        };

    discoverRels(client, function(err, rels) {

        if (err) {

            showError(500, "Can't get host-meta for " + client);

        } else if (!rels.hasOwnProperty('ack-validate')) {

            showError(500, "No ACK support in " + client);

        } else {

            var params = {
                ack_server: hostname,
                ack_nonce: nonce
            };

            postRequest(rels['ack-validate'].href, params, function(err, cres, body) {

                if (err || cres.statusCode !== 200) {

                    showError(500, "Can't validate nonce");

                } else {

                    makeNewCredentials(client, function(err, identifier, sharedSecret) {
                        if (err) {
                            showError(500, "Can't make new credentials");
                        } else {
                            showSuccess({ack_client_identifier: identifier,
                                         ack_client_shared_secret: sharedSecret});
                        }
                    });
                }
            });
        }
    });
};

var hostMeta = function(req, res) {

    var linkRel = function(rel, href) {
        res.write('<Link rel="' + rel + '" href="' + href + '" />');
    };

    var localUrl = function(relative) {
        return 'http://' + hostname + '/' + relative;
    };

    res.writeHead(200, {'Content-Type': 'application/xrd+xml',
                        'Access-Control-Allow-Origin': '*'});

    res.write("<?xml version='1.0' encoding='UTF-8'?>\n");

    res.write('<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">');

    res.write('<hm:Host xmlns:hm="http://host-meta.net/xrd/1.0">' + hostname + '</hm:Host>');

    linkRel('ack-request', localUrl('giveMeAKey'));

    res.end('</XRD>');
};

var server = connect.createServer(
    connect.logger(),
    connect.bodyParser(),
    connect.query(),
    connect.errorHandler({showMessage: true}),
    connect.router(function(app) {
        app.get('/.well-known/host-meta', hostMeta);
        app.post('/giveMeAKey', giveMeAKey);
    })
);

server.listen(80);

