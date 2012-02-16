// client for ACK
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
    qs = require('querystring'),
    http = require('http'),
    config = require('./config');

var hostname = config.hostname;

if (!hostname) {
    hostname = os.hostname();
}

var nonces = {};

var makeANewNonce = function(server, callback) {

    randomString(16, function(err, nonce) {
        if (err) {
            callback(err, null);
        } else {
            nonces[nonce] = {server: server, 
                             timestamp: Date.now(),
                             sync: true,
                             used: false};
            callback(null, nonce);
        }
    });
};

var MAX_DELAY = 5 * 60 * 1000; // Five minutes, for synch, should be enough

var checkNonce = function(nonce, server, callback) {

    if (!nonces.hasOwnProperty(nonce)) {
        callback(new Error("No such nonce."), null);
        return;
    }

    if (nonces[nonce].server !== server) {
        callback(new Error("Nonce for wrong server"), null);
        return;
    }

    if (Date.now() - nonces[nonce].timestamp > MAX_DELAY) {
        callback(new Error("Nonce is expired."), null);
        return;
    }

    nonces[nonce].used = true;

    callback(null, nonces[nonce]);
};

var invalidateNonce = function(nonce, callback) {
    delete nonces[nonce];
    callback(null);
};

var isThisAValidNonce = function(req, res) {

    var nonce = req.params.ack_nonce,
        server = req.params.ack_server;

    // XXX: throttle abusive requests

    checkNonce(nonce, server, function(err, rec) {
        if (err) {
            res.writeHead(400, {'Content-Type': 'text/plain'});
            res.end('Not valid');
        } else {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Valid');
        }
    });
};

var getAKeyFromServer = function(req, res) {
    var server = req.params.server;
    var showHTML = function(status, message) {
        res.writeHead(status, {'Content-Type': 'text/html'});
        res.end("<!DOCTYPE html>\n"+
                "<html>" +
                "<head><title>ACK Result</title></head>" +
                "<body>" +
                "<h1>ACK Result</h1>" +
                "<p>"+
                message +
                "</p>" +
                "</body>" +
                "</html>");
    };
    discoverRels(server, function(err, rels) {
        var parts, options, creq, params, nonce;
        if (err) {
            showHTML(500, err.message);
        } else if (!rels.hasOwnProperty('ack-request')) {
            showHTML(400, "Server " + server + " not ACK-capable.");
        } else {

            makeANewNonce(server, function(err, nonce) {
                params = {
                    'ack_client': hostname,
                    'ack_nonce': nonce
                };
                postRequest(rels['ack-request'].href, params, function(err, res, body) {
                    if (err) {
                        showHTML(500, err.message);
                    } else if (res.statusCode != 200) {
                        showHTML(400, "Got an error from " + server);
                    } else {
                        invalidateNonce(nonce, function(err) {
                            var cred = null;
                            if (err) {
                                showHTML(500, err.message);
                            } else {
                                cred = qs.parse(body);
                                showHTML(200, "Got identifier '" + cred.identifier + "' and secret (shh!) '" + cred.sharedSecret + "'");
                            }
                        });
                    }
                    return;
                });
            });
        }
    });
};

var showServerForm = function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end("<!DOCTYPE html>\n"+
            "<html>" +
            "<head><title>ACK Example</title></head>" +
            "<body>" +
            "<h1>ACK Example</h1>" +
            "<p>"+
            "<form method='post' action='/'>"+
            "<label for='server'>Server</label>: <input type='text' size='30' name='server' id='server'/>"+
            "</form>" +
            "</p>" +
            "</body>" +
            "</html>");
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

    linkRel('ack-validate', localUrl('isThisAValidNonce'));

    res.end('</XRD>');
};

var server = connect.createServer(
    connect.logger(),
    connect.bodyParser(),
    connect.errorHandler({showMessage: true}),
    connect.router(function(app) {
        app.get('/.well-known/host-meta', hostMeta);
        app.get('/', showServerForm);
        app.post('/', getAKeyFromServer);
        app.post('/isThisAValidNonce', isThisAValidNonce);
    })
);

server.listen(80);

