// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('mousetrap');
require('bootstrap');
require('fabric');
const {ipcRenderer} = require('electron');

// creation of the main app object
var app = new PTree('canvas');

// when jQuery is ready
$(function() {
   // bootstrap tooltip initialization
   $('[data-toggle="tooltip"]').tooltip({
      delay: {
         show: 1000,
         hide: 100
      }
   });
});

// data received from the main process
ipcRenderer.once('PTree-window-open', function(event, opendata) {
   if(null !== opendata.fileToOpen) {
      app.open(opendata.fileToOpen);
   }
});

// data received from the main process
ipcRenderer.on('PTree-openFile', function(event, fileToOpen) {
   app.open(fileToOpen);
});
