import React from 'react';
import { render } from 'react-dom';
import brace from 'brace';
import AceEditor from 'react-ace';
import GooglePicker from 'react-google-picker';

import 'brace/mode/java';
import ReactDOM from 'react-dom';

// The Browser API key obtained from the Google Developers Console.
const developerKey = 'AIzaSyCZxBa8O8nqTM0xDBCjX0Q1ff8zwV9ZMzw';

// The Client ID obtained from the Google Developers Console. Replace with your own Client ID.
const clientId = '576255310053-nl3vla4sgg0cmu9ieb3l79fca2iuhrcs.apps.googleusercontent.com';

// Scope to use to access user's items.
const scope = ['https://www.googleapis.com/auth/drive'];

let pickerApiLoaded = false;
let oauthToken;
let data;
let docID;
let folderID;

function onChange(newValue) {
  console.log('change',newValue);
}


export default class UghWorld extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: "hello" };
    this.onApiLoad();
    window.it = this;
  }

  createPicker() {
    if (pickerApiLoaded && oauthToken) {

      // create a new picker object
      const picker = new google.picker.PickerBuilder()
                  .addView(google.picker.ViewId.DOCS)
                  .setOAuthToken(oauthToken)
                  .setDeveloperKey(developerKey)
                  .setCallback((data) => this.pickerCallback(data))
                  .build();
      picker.setVisible(true);
    }
    console.log('Pick from Google Drive was clicked!');
  }

  // Use the API Loader script to load google.picker and gapi.auth.
  onApiLoad() {

    // load the APIs
    gapi.load('auth', {
      callback: () => this.onAuthApiLoad(),
    });
    gapi.load('client:picker', {
      callback: () => this.onPickerApiLoad(),
    });
    console.log('in the function onApiLoad');
  }

  onAuthApiLoad() {
    window.gapi.auth.authorize({
      client_id: clientId,
      scope,
      immediate: false,
    },

    // log the user in
    this.handleAuthResult);
  }

  onPickerApiLoad() {
    pickerApiLoaded = true;
  }

  handleAuthResult(authResult) {
    if (authResult && !authResult.error) {
      oauthToken = authResult.access_token;
      console.log('in the function handleAuthResult');
      console.log(`The token is: ${oauthToken}`);
    }
  }

  // A simple callback implementation.
  pickerCallback(data) {
    var that = this;
    if (data === undefined) {
      console.log('undefined callback');
      return;
    }

    // check that the user picked a file
    if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
      const doc = data[google.picker.Response.DOCUMENTS][0];

      // make the request to the google drive server
      gapi.client.request({
        path: `/drive/v2/files/${doc.id}`,
        method: 'GET',
        callback(obj) {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', obj.downloadUrl);
          xhr.setRequestHeader('Authorization', `Bearer ${gapi.auth.getToken().access_token}`);
          console.log(`The access token is: ${gapi.auth.getToken().access_token}`);
          xhr.onload = function () {
            console.log(xhr.response);
            const data = xhr.response;
            const output = document.getElementById('output');
            docID = doc.id;
            console.log(`The DOC ID is: ${docID}`);
            const responseObj = {
              Data: data,
            };
            that.setState({value : data});
          };
          xhr.send();
        },
      });
    }
  }

  createNewFile() {
      // (docID, this.state.value) => this.gd_updateFile(docID, this.state.value);
      this.gd_updateFile(docID, this.state.value);
  }

  gd_updateFile(fileId, text, callback) {
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

  render() {
    return (
      <div>
        <section className="flat">
          <select name="mydropdown">
            <option value="OCaml">OCaml</option>
            <option value="ClojureScript">ClojureScript</option>
            </select>
            <button>Run (Sham)</button>
            <button>Run (Yield)</button>
            <button>Run (Regenerator)</button>
            <button>Run (CPS)</button>
            <button>Stop</button>
            <button onClick={this.createNewFile.bind(this)}>Save</button>
            <button onClick={this.createPicker.bind(this)}>Pick From Google Drive</button>
            </section>
            <AceEditor
              mode ="java"
              value={this.state.value}
              onChange={(newValue) => this.setState({value : newValue}) }
              theme = "ace/theme/chaos"
              />
            </div>
    );
  }
}

ReactDOM.render(
  <UghWorld />,
  document.getElementById('item1'),
);
