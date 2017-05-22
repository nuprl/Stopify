          var editor = ace.edit("editor")
          editor.setTheme("ace/theme/chaos");
          editor.session.setMode("ace/mode/java");

          // The Browser API key obtained from the Google Developers Console.
          var developerKey = 'AIzaSyCZxBa8O8nqTM0xDBCjX0Q1ff8zwV9ZMzw';

          // The Client ID obtained from the Google Developers Console. Replace with your own Client ID.
          var clientId = "576255310053-nl3vla4sgg0cmu9ieb3l79fca2iuhrcs.apps.googleusercontent.com"

          // Scope to use to access user's items.
          var scope = ['https://www.googleapis.com/auth/drive.readonly'];

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
                  console.log("The auth token is: " + oauthToken);
                  //console.log("The access token is: " + authResult.access_token);
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

//   function createNewFile() {
//     gapi.client.load('drive', 'v2', function() {
//         var request = gapi.client.request({
//             'path': '/drive/v2/files',
//             'method': 'POST',
//             'body':{
//                 "title" : "test.txt",
//                 "description" : "Some"
//             }
//         });
//         request.execute(function(resp) { console.log(resp); });
//     });
// }

// function createNewFile() {
//   //console.log("My name is Nicole"); 
//   //printAbout(); 
//   console.log("This time the doc ID is: " + docID);
//   //console.log("The time the root folder ID is: " + folderID); 
//   gd_updateFile(docID, root, "fjdfj"); 
// }


//   function gd_updateFile(fileId, folderId, text, callback) {

//     const boundary = '-------314159265358979323846';
//     const delimiter = "\r\n--" + boundary + "\r\n";
//     const close_delim = "\r\n--" + boundary + "--";

//     var contentType = "text/html";
//     var metadata = {'mimeType': contentType,};

//     var multipartRequestBody =
//         delimiter +  'Content-Type: application/json\r\n\r\n' +
//         JSON.stringify(metadata) +
//         delimiter + 'Content-Type: ' + contentType + '\r\n' + '\r\n' +
//         text +
//         close_delim;

//     if (!callback) { callback = function(file) { console.log("Update Complete ",file) }; }

//     gapi.client.request({
//         'path': '/upload/drive/v2/files/'+folderId+"?fileId="+fileId+"&uploadType=multipart",
//         'method': 'PUT',
//         'params': {'fileId': fileId, 'uploadType': 'multipart'},
//         'headers': {'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'},
//         'body': multipartRequestBody,
//         callback:callback,
//     });
//   }


// function createNewFile() {
//   //console.log("My name is Nicole"); 
//   //printAbout(); 
//   console.log("This time the doc ID is: " + docID);
//   //console.log("The time the root folder ID is: " + folderID); 
//   gd_updateFile(docID, "fjdfj"); 
// }


//   function gd_updateFile(fileId, text, callback) {

//     const boundary = '-------314159265358979323846';
//     const delimiter = "\r\n--" + boundary + "\r\n";
//     const close_delim = "\r\n--" + boundary + "--";

//     var contentType = "text/html";
//     var metadata = {'mimeType': contentType,};

//     var multipartRequestBody =
//         delimiter +  'Content-Type: application/json\r\n\r\n' +
//         JSON.stringify(metadata) +
//         delimiter + 'Content-Type: ' + contentType + '\r\n' + '\r\n' +
//         text +
//         close_delim;

//     if (!callback) { callback = function(file) { console.log("Update Complete ",file) }; }

//     gapi.client.request({
//         'path': '/upload/drive/v2/files/'+"?fileId="+fileId+"&uploadType=multipart",
//         'method': 'PUT',
//         'params': {'fileId': fileId, 'uploadType': 'multipart'},
//         'headers': {'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'},
//         'body': multipartRequestBody,
//         callback:callback,
//     });
//   }



function createNewFile() {
  //console.log("My name is Nicole"); 
  //printAbout(); 
  console.log("This time the doc ID is: " + docID);
  //console.log("The time the root folder ID is: " + folderID); 
  uploadFile(docID, "My name is slim shady"); 
}




function uploadFile(id, text)                                                                                                                                                          
{
  var auth_token = gapi.auth.getToken().access_token;

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  var metadata = { 
      description : 'savefile for my game',
      'mimeType': 'application/json'
  };  

  var multipartRequestBody =
    delimiter +  'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter + 'Content-Type: application/json\r\n\r\n' +
    text +
    close_delim;

  gapi.client.request
    ( { 
     'path': '/upload/drive/v3/files/'+id,
     'method': 'PATCH',
     'params': {'fileId': id, 'uploadType': 'multipart'},
     'headers': { 'Content-Type': 'multipart/form-data; boundary="' + boundary + '"', 'Authorization': 'Bearer ' + auth_token, },
     'body': multipartRequestBody 
     }).execute(function(file) { console.log("Wrote to file " + file.name + " id: " + file.id); }); 
}












  // function printAbout() {
  //   console.log("The gapi client drive is: " + gapi.client.drive); 
  //   var request = gapi.client.drive.about.get(); 
  //   request.execute(function(resp) {
  //     folderID = resp.rootFolderId;
  //     console.log("The current user name is: " + resp.name); 
  //     console.log("The root folder ID is: " + resp.rootFolderId);
  //     console.log("The root folder ID is still : " + folderID); 
  //   })
  // }

  // function printAbout() {
  //   gapi.client.request.execute(function(resp) {
  //     folderID = resp.rootFolderId; 
  //     console.log("The current user name is: " + resp.name); 
  //     console.log("The root folder ID is: " + resp.rootFolderId);
  //     console.log("The folder ID saved in a variable is: " + folderID);
  //   })
  // }




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
                              //var fileId = data.docs[0].id;
                              console.log("The DOC ID is: " + docID);
                              //console.log("The file ID is: " + fileId);  
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

