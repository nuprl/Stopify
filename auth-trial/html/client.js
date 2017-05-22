          var editor = ace.edit("editor")
          editor.setTheme("ace/theme/chaos");
          editor.session.setMode("ace/mode/java");

          // The Browser API key obtained from the Google Developers Console.
          var developerKey = 'AIzaSyCZxBa8O8nqTM0xDBCjX0Q1ff8zwV9ZMzw';

          // The Client ID obtained from the Google Developers Console. Replace with your own Client ID.
          var clientId = "576255310053-nl3vla4sgg0cmu9ieb3l79fca2iuhrcs.apps.googleusercontent.com"

          // Scope to use to access user's items.
          var scope = ['https://www.googleapis.com/auth/drive'];

          var pickerApiLoaded = false;
          var oauthToken;
          var data;
          var docID;
          var folderID;

          // Use the API Loader script to load google.picker and gapi.auth.
          function onApiLoad() {
              // load the APIs
              gapi.load('auth', {
                  'callback': onAuthApiLoad
              });
              gapi.load('client:picker', {
                  'callback': onPickerApiLoad
              });
          }

          function onAuthApiLoad() {
              window.gapi.auth.authorize({
                      'client_id': clientId,
                      'scope': scope,
                      'immediate': false
                  },
                  // log the user in
                  handleAuthResult);
          }

          function onPickerApiLoad() {
              pickerApiLoaded = true;
          }

          function handleAuthResult(authResult) {
              if (authResult && !authResult.error) {
                  oauthToken = authResult.access_token;
                  console.log("The token is: " + oauthToken);
              }
          }

          // Create and render a Picker object for picking user items.
          function createPicker() {
              if (pickerApiLoaded && oauthToken) {
                  // create a new picker object
                  var picker = new google.picker.PickerBuilder().
                  addView(google.picker.ViewId.DOCS).
                  setOAuthToken(oauthToken).
                  setDeveloperKey(developerKey).
                  setCallback(pickerCallback).
                  build();
                  picker.setVisible(true);
              }
          }


          function createNewFile() {
              console.log("This time the doc ID is: " + docID);
              gd_updateFile(docID, editor.getValue());
          }


          function gd_updateFile(fileId, text, callback) {

              const boundary = '-------314159265358979323846';
              const delimiter = "\r\n--" + boundary + "\r\n";
              const close_delim = "\r\n--" + boundary + "--";

              var contentType = "text/html";
              var metadata = {
                  'mimeType': contentType,
              };

              var multipartRequestBody =
                  delimiter + 'Content-Type: application/json\r\n\r\n' +
                  JSON.stringify(metadata) +
                  delimiter + 'Content-Type: ' + contentType + '\r\n' + '\r\n' +
                  text +
                  close_delim;

              if (!callback) {
                  callback = function(file) {
                      console.log("Update Complete ", file)
                  };
              }

              gapi.client.request({
                  'path': '/upload/drive/v3/files/' + fileId + "&uploadType=multipart",
                  'method': 'PATCH',
                  'params': {
                      'fileId': fileId,
                      'uploadType': 'multipart'
                  },
                  'headers': {
                      'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
                  },
                  'body': multipartRequestBody,
                  callback: callback,
              });
          }

          // A simple callback implementation. 
          function pickerCallback(data) {
              // check that the user picked a file
              if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
                  var doc = data[google.picker.Response.DOCUMENTS][0];
                  // make the request to the google drive server
                  gapi.client.request({
                      path: '/drive/v2/files/' + doc.id,
                      method: 'GET',
                      callback: function(obj) {
                          const xhr = new XMLHttpRequest();
                          xhr.open("GET", obj.downloadUrl);
                          xhr.setRequestHeader("Authorization", "Bearer " + gapi.auth.getToken().access_token);
                          console.log("The access token is: " + gapi.auth.getToken().access_token);
                          xhr.onload = function() {
                              console.log(xhr.response);
                              var data = xhr.response;
                              var output = document.getElementById("output");
                              docID = doc.id;
                              console.log("The DOC ID is: " + docID);
                              var responseObj = {
                                  Data: data
                              };
                              editor.setValue(data);
                          }
                          xhr.send();
                      }
                  });
              }
          }