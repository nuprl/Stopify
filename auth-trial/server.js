"use strict";

const express = require('express');
const path = require('path');
const app = express();
var bodyParser = require('body-parser');
var fs = require('fs');


app.use(express.static(path.join(__dirname, 'html')));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

/*
Method which retrieves the ID Token of the user signed in, verifies that it is a valid Google ID Token and writes String representations of the ID Token to the consoles. 
*/
app.post('/tokensignin', function(req, res) {
    console.log('POST /tokensignin');
    // some code taken from google authentication tutorial
    var idToken = req.body['IDToken'];
    var GoogleAuth = require('google-auth-library');
    var auth = new GoogleAuth;
    var client = new auth.OAuth2(
        '576255310053-nl3vla4sgg0cmu9ieb3l79fca2iuhrcs.apps.googleusercontent.com');
    client.verifyIdToken(
        idToken,
        '576255310053-nl3vla4sgg0cmu9ieb3l79fca2iuhrcs.apps.googleusercontent.com',
        function(e, login) {
            var payload = login.getPayload();
            var userid = payload['sub'];
        });

    // print the ID Token to the server console 
    console.log(JSON.stringify(req.body));

    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    // write the String representation of the ID Token to the HTTP output (client, or web browser, console)
    res.write(idToken);
    res.end();
});
console.log('server is running...');
app.listen(8080);