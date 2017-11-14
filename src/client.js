var net = require('net');
var JsonSocket = require('json-socket');
var validator = require('xsd-schema-validator');
const args = process.argv;
var messageFormat = args[2];
var dictionary = {"command":messageFormat, "methode":args[3], "field":args[4]};

var client = new JsonSocket(new net.Socket());
client.connect(6512, '127.0.0.1', function() {
    console.log('Connected');
    client.sendMessage(dictionary);
    console.log("Sent to proxy: " + dictionary);
});

client.on('message', function(data) {
    if(messageFormat === "sendxml"){
        /*var xmlStr = "<?xml version='1.0'?> <root><angajati><nume>Vieru</nume><prenume>Vasile</prenume><salariu>gfdgd</salariu></angajati></root>"*/
        console.log(data);
        validator.validateXML(data, '/home/vasile/IdeaProjects/lab2PAD/angajati.xsd',function (err, result) {
            if(err){
                throw err;
            }
            console.log("Xml validating: " + result.valid);
        });
    }else if(messageFormat === "sendjson"){
        console.log(JSON.stringify(JSON.parse(data)));
    }
    //console.log("data: " + data);
    //console.log('Received: '+ JSON.parse(JSON.stringify(data)));
});

/*client.on('data', function (data) {
    console.log('Data: ' + data);
});*/

client.on('close', function() {
    console.log('Connection closed');
});