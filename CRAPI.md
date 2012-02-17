Client Registration API
-----------------------

This is a sketch for an API to do automated registration of OAuth
clients. I try to follow the terminology used in RFC 5849.

Flow
====

In this flow, a client gets new client credentials from a server.

1. Client uses Host-Meta (RFC 6415) to discover a CRAPI request
   endpoint for server. This is a link with relationship type
   "crapi-request".

2. Client POSTs a request to the CRAPI request endpoint, with the
   following parameters:

   * `crapi_client`: hostname for the client. Required.
   * `crapi_nonce`: opaque, unique identifier for this request. Required.
   * `crapi_client_type`: type of client. Optional; defaults to "confidential".
   * `crapi_client_redirection_uri`: an URI to use for redirection. Optional.

3. Server uses Host-Meta on the host provided in `crapi_client` to
   discover a CRAPI validator endpoint. This is a link with
   relationship type "crapi-validate".

4. Server POSTs a request to the CRAPI validator endpoint with the
   following parameters:

   * `crapi_nonce`: the nonce passed with the request.
   * `crapi_server`: hostname for the server.

5. Client validates that:
   
   * it has made a request using the nonce in `crapi_nonce`
   * the request went to the CRAPI request endpoint for crapi_server
   * it was made relatively recently (say, within 5 minutes, for synch requests)

   Client returns a 200 status code for successful validation. 4xx or
   5xx codes represent an invalid nonce.

6. After validation, server returns new client credentials to CRAPI
   request. The results are a URL-encoded, with the following fields:

   * `crapi_client_identifier`: a new client identifier
   * `crapi_client_shared_secret`: a new shared secret for the client.

   The server should use TLS for its CRAPI request endpoint, since
   it's sending back credentials in the clear.
