// -----------------------------------------------------------------------------
// PTree window renderer script
// -----------------------------------------------------------------------------

// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('mousetrap');
require('bootstrap');
require('fabric');

// Send an IPC sync msg to main.js: request init data
const initData = require('electron').ipcRenderer.sendSync('PTree-initDataReq');

// init the global object that will handle this renderer
let app = {};

// when jQuery is ready
$(() => {
  // creation of the PTree object
  app = new PTree('canvas');

  // if there is a file to open on startup
  if(null !== initData.fileToOpen) {
    app.open(initData.fileToOpen);
  }

  // bootstrap tooltip initialization
  $('[data-toggle="tooltip"]').tooltip({
    delay: {show: 1000, hide: 100}
  });
});
