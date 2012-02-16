// main function for activity spam checker
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
    config = require('./config');

var hostname = config.hostname;

if (!hostname) {
    throw new Error("Must define a hostname in config file.");
}

var server = connect.createServer(
    connect.logger(),
    connect.bodyParser(),
    connect.errorHandler({showMessage: true}),
    connect.router(function(app) {
        app.get('/.well-known/host-meta', hostMeta);
        app.post('/giveMeAKey', giveMeAKey);
        app.post('/giveMeAKeyLater', giveMeAKeyLater);
        app.post('/isThisAValidNonceAndTimestamp', isThisAValidNonceAndTimestamp);
        app.post('/hereIsYourKey', hereIsYourKey);
    })
);

var unimplemented = function(req, res) {
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end('Unimplemented (yet)');
};

var giveMeAKey = unimplemented;
var giveMeAKeyLater = unimplemented;
var isThisAValidNonceAndTimestamp = unimplemented;
var hereIsYourKey = unimplemented;

var hostMeta = function(req, res) {

    var linkRel = function(rel, href) {
        res.write('<Link rel="' + rel + '" href="' + href + '" />');
    },
        localUrl = function(relative) {
            return 'http://' + hostname + '/' + relative;
        };

    res.writeHead(200, {'Content-Type': 'application/xrd+xml',
                        'Access-Control-Allow-Origin': '*'});

    res.write("<?xml version='1.0' encoding='UTF-8'?>\n");

    res.write('<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">');

    res.write('<hm:Host xmlns:hm="http://host-meta.net/xrd/1.0">' + hostname + '</hm:Host>');

    linkRel('ack-request', localUrl('giveMeAKey'));
    linkRel('ack-request-async', localUrl('giveMeAKeyLater'));
    linkRel('ack-validate', localUrl('isThisAValidNonceAndTimestamp'));
    linkRel('ack-response', localUrl('hereIsYourKey'));

    res.end('</XRD>');
};

server.listen(80);

