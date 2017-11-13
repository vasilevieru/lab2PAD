var net = require('net');
var JsonSocket = require('json-socket');
var dgram = require('dgram');
var s = dgram.createSocket('udp4');
var json2xml = require('js2xmlparser');

var LOCAL_PORT = 6512;
var PORT = 8001;
var REMOTE_ADDR = "localhost";
var MULTICAST_IP = "225.0.0.1";
var data_nodes = [];
var registered = "you are registered";
var sendmore = "I dont received anything from you";
var selectedNode = [];
var ipNodeSelected, portNodeSelected;
var receivedData, xml;


function sortData() {
    if (data_nodes.length > 1) {
        data_nodes.sort(function (a, b) {
            return parseFloat(a.links) - parseFloat(b.links);
        });
    }
    console.log(data_nodes);
    selectNode();
}

function selectNode() {
    if (data_nodes.length > 0) {
        selectedNode = data_nodes[data_nodes.length - 1];
    }
    ipNodeSelected = selectedNode.ip;
    portNodeSelected = selectedNode.port;
    console.log(ipNodeSelected + ":" + portNodeSelected);
    sendMessageToSendData();
}

var server = net.createServer(function (socket) {
    socket = new JsonSocket(socket);
    socket.on('message', function (msg) {
        if (msg.message === "sendjson") {
            console.log('  ** START **');
            console.log('<< From client to proxy: ', msg.message.toString());
            socket.sendMessage(receivedData);
        }else if(msg.message === "sendxml"){
            socket.sendMessage(xml);
        }
    });
    socket.on('end', function () {
        console.log("Disconnected\n");
    });
});

server.listen(LOCAL_PORT);
console.log("TCP server accepting connection on: " + REMOTE_ADDR + ":" + LOCAL_PORT);

function sendMessageToSendData() {
    if (ipNodeSelected && portNodeSelected) {
        var client = new JsonSocket(new net.Socket());
        client.connect(portNodeSelected, ipNodeSelected.toString(), function () {
            console.log("Connected to " + ipNodeSelected + ":" + portNodeSelected);
            client.sendMessage({"command": "sendAll"});
        });

        client.on('message', function (data) {
            //console.log('Received: ' + data);
            receivedData = JSON.stringify(data);

            xml = json2xml.parse("root", JSON.parse(JSON.stringify(data)));
            console.log(receivedData);
            //console.log(xml);
        });

        client.on('close', function () {
            console.log('Connection closed');
        });
    }
}

s.bind(PORT, function () {
    s.addMembership(MULTICAST_IP);
    console.log("listening on all addresses");
});

s.on("message", function (msg, rinfo) {
    console.log(msg);
    if (msg.length === 1) {
        var node = {"ip": rinfo.address, "port": rinfo.port, "links": +msg};
        data_nodes.push(node);
        s.send(registered, 0, registered.length, rinfo.port, rinfo.address, function (err, bytes) {
            if (err) {
                console.error(err);
            }
            console.log("Sent " + bytes + " bytes");
        });
    } else if (!msg) {
        s.send(sendmore, 0, sendmore.length, rinfo.port, rinfo.address, function (err, bytes) {
            if (err) {
                console.error(err);
            }
            console.log("Sent " + bytes + " bytes");
        });
    }
    console.log("server got: " + msg + " from " +
        rinfo.address + ":" + rinfo.port);
    var message = new Buffer("Address to send data is: " + REMOTE_ADDR + ":" + LOCAL_PORT);
    s.send(message, 0, message.length, rinfo.port, rinfo.address, function (err) {
        if (err) {
            console.error(err);
        }
        console.log("Sent to client: " + message);
    });
    node = null;
});

s.on('close', function () {
    console.log('Socket is closed !');
});

setTimeout(function () {
    console.log("UPD Multicas server is closing");
    s.close();
    sortData();
}, 25000);

s.on('error', function (err) {
    console.log('server error:\n' + err.stack);
    server.close();
});
