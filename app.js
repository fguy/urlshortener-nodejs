var http = require('http');
var base62 = require('base62');
var fs = require('fs');
var redis = require('redis');

client = redis.createClient();

var shorten = function(url, response) {
	// may need url canonicalization here
	var lookupKey = 'lookup-' + url;
	// find existing with lookupKey
	client.get(lookupKey, function(err, result) {
		if (result) {
			response.writeHead(200, {
				'Content-Type' : 'text/plain'
			});
			response.end(result.toString());
			return;
		}
		client.incr('id', function(err, result) {
			var id = base62.encode(result.toString());
			client.mset([ 'url-' + id, url, lookupKey, id ], function(err,
					result) {
				response.writeHead(201, {
					'Content-Type' : 'text/plain'
				});
				response.end(id);
			});
		});
	});
}

var resolve = function(id, response) {
	var lookupKey = 'url-' + id;
	client.get(lookupKey, function(err, result) {
		if (result) {
			response.writeHead(302, {
				'Location' : result.toString()
			});
			response.end();
			return;
		}
		response.writeHead(404);
		response.end();
	});
}

var server = http.createServer(function(request, response) {
	switch (request.method) {
	case 'PUT':
		var body = '';
		request.on('data', function(data) {
			body += data;
		}).on('end', function() {
			shorten(body, response);
		});
		break;
	case 'GET':
		if (request.url != '/') {
			resolve(request.url.substring(1), response);
			break;
		}
	default:
		var stream = fs.createReadStream('index.html');
		stream.pipe(response);
		break;
	}
});

server.listen(8000);

console.log('URL shortener server running at http://localhost:8000/');