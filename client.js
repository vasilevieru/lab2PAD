
var net = require('net');
var JsonSocket = require('json-socket');

var client = new JsonSocket(new net.Socket());
client.connect(6512, '127.0.0.1', function() {
    console.log('Connected');
    client.sendMessage({"message":"sendData"});
});

client.on('message', function(data) {
    console.log('Received: '+ JSON.parse(JSON.stringify(data)));
});

client.on('close', function() {
    console.log('Connection closed');
});