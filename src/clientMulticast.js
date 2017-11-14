var dgram = require('dgram');
var s = dgram.createSocket('udp4');
var JsonSocket = require('json-socket');
var fs = require('fs');
var net = require('net');

var client;
var MULTICAST_IP = "225.0.0.1";
const args = process.argv;
var PORT = args[2];
console.log(PORT);
var filename = args[3];
var links = null;
var p = [];
var messageJson, collectedMessages;
var methode;

function initializePorts(port) {
    if (port === "8002") {
        p = ["8003"];
    } else if (port === "8003") {
        p = ["8002", "8004", "8005"];
    } else if (port === "8004") {
        p = ["8003"];
    } else if (port === "8005") {
        p = ["8003", "8006", "8007"];
    } else if (port === "8006") {
        p = ["8005"];
    } else if (port === "8007") {
        p = ["8005"];
    } else {
        return null;
    }
    return p;
}

function getLinks(port) {
    if (port === "8002") {
        links = new Buffer("1");
    } else if (port === "8003") {
        links = new Buffer("3");
    } else if (port === "8004") {
        links = new Buffer("1");
    } else if (port === "8005") {
        links = new Buffer("3")
    } else if (port === "8006") {
        links = new Buffer("1")
    } else if (port === "8007") {
        links = new Buffer("1");
    } else {
        links = null;
    }
    return links;
}

var json = fs.readFileSync('/home/vasile/IdeaProjects/lab2PAD/' + filename, 'utf-8');
console.log(json);

function sortData(data) {
    var js = JSON.parse(data);
    if(js.angajati.length > 2) {
        var angajati = js.angajati.sort(function (a, b) {
            return a.salariu - b.salariu;
        });
        console.log("Sortat:" + JSON.stringify(angajati));
        return angajati;
    }else{
        return js.angajati;
    }
}

function filterData(data) {
    var js = JSON.parse(data);
    var filtered = js.angajati.filter(function (t) {
        return t.salariu >= 5000
    });
    console.log("Filtrat: " + JSON.stringify(filtered));
    return filtered;
}


s.on('message', function (message, rinfo) {
    console.log('Message from UDP multicast: ' + rinfo.address + ':' + rinfo.port + ' - ' + message);
    getLinks(PORT);
    if (links) {
        s.send(links, 0, links.length, 8001, MULTICAST_IP, function (err, bytes) {
            console.log(bytes + " bytes");
            s.close();
        });
    } else {
        s.send("", 0, 0, 8001, MULTICAST_IP, function (err, bytes) {
            console.log(bytes + " bytes");
            s.close();
        });
    }
});

function sendMulticastHello(s) {
    var b = new Buffer("Hello Multicast!");
    s.send(b, 0, b.length, 8001, MULTICAST_IP, function (err, bytes) {
        console.log("Sent " + bytes + " bytes");
    });
}

s.bind(PORT, function () {
    s.addMembership(MULTICAST_IP);
});

sendMulticastHello(s);

function sendMessagetoNodes(i) {
    initializePorts(PORT);
    if (i < p.length) {
        console.log(p[i]);
        client = new JsonSocket(new net.Socket());
        client.connect(p[i], "localhost", function () {
            client.sendMessage({"command": "send", "methode":methode});
            messageJson = null;
            console.log("vrea sa trimita mesaj");
        });
        client.on("message", function (data) {
            messageJson = JSON.parse(data);
            //console.log(messageJson.angajati);
            console.log(messageJson);
            console.log("Se duce in for");
            for (var j = 0; j < messageJson.length; j++) {
                collectedMessages.angajati.push(messageJson[j]);
            }

            sendMessagetoNodes(i + 1);
        });
    }
    /* else {
            console.log(JSON.stringify(collectedMessages));
        }*/
}

function connectToNodes(port, callback) {
    console.log(port);
    callback();
}

var server = net.createServer(function (socket) {
    socket = new JsonSocket(socket);
    socket.on('message', function (msg) {
        console.log(msg);
        if (msg.command === "sendAll") {
            if(msg.methode === "sort"){
                methode = msg.methode;
            }
            collectedMessages = JSON.parse(json);
            connectToNodes(p[0], function () {
                sendMessagetoNodes(0);
            });

            setTimeout(function () {
                //console.log("Collected messages" + JSON.stringify(collectedMessages))
                socket.sendMessage(collectedMessages, function () {
                    console.log("sent :" + JSON.stringify(collectedMessages));
                });
            }, 1000);
        }
        else if (msg.command === "send") {
            console.log(msg.methode);
            if(msg.methode === "sort"){
                console.log(json);
                var result = sortData(json);
                socket.sendMessage(JSON.stringify(result), function () {
                    console.log("Sent to principal node:" + JSON.stringify(result));
                });
            }
        }
    });
    socket.on('end', function () {
        process.exit();
        console.log("Disconnected\n");
    });
});
server.listen(PORT);
console.log("TCP server accepting connection on port: " + PORT);
