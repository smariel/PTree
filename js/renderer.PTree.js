// -----------------------------------------------------------------------------
// PTree window renderer script
// -----------------------------------------------------------------------------

// Security : disable window.eval() in this rendrer
window.eval = global.eval = function () {
  throw new Error(`This application does not support window.eval().`);
};

// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('bootstrap');
const PTree         = require('../js/class.PTree.js');
const {ipcRenderer} = require('electron');

// global object that will handle this renderer
let ptree;

// When jQuery is ready
$(() => {
  // On reception of the init data
  ipcRenderer.once('PTree-initDataResp', (event, initData) => {
    // creation of the PTree object
    ptree = new PTree('canvas');

    // set lock and backup options
    ptree.enableLock   = initData.enableLock;
    ptree.enableBackup = initData.enableBackup;

    // if there is a file to open on startup
    if(null !== initData.fileToOpen) {
      ptree.open(initData.fileToOpen);
    }

    // check for updates, eventualy
    if(initData.checkUpdate) {
      ptree.checkUpdate();
    }
  });

  // Send an IPC async msg to main.js: request init data
  ipcRenderer.send('PTree-initDataReq');

  // bootstrap tooltip initialization
  $('[data-toggle="tooltip"]').tooltip({
    delay: {show: 1000, hide: 100}
  });
});
