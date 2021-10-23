// -----------------------------------------------------------------------------
// Sequence Editor window renderer script
// -----------------------------------------------------------------------------

// Security : disable window.eval() in this rendrer
window.eval = global.eval = function () {
  throw new Error(`This application does not support window.eval().`);
};

// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('bootstrap');
const {ipcRenderer} = require('electron');
const Tree = require('../js/class.Tree.js');
const {SequenceList} = require('../js/class.Sequence.js');
const SequenceEditor = require('../js/class.SequenceEditor.js');

// global object that will handle this renderer
// eslint-disable-next-line no-unused-vars
let seqEditor;

// When jQuery is ready
$(() => {
  // On reception of the init data
  ipcRenderer.once('SequenceEditor-initDataResp', (event, initData) => {
    // reconstruct the tree
    let tree = new Tree(false);
    tree.import(initData.tree);

    // reconstruct the sequence list
    let seqList = SequenceList.import(initData.seqList);

    // create the sequence editor
    seqEditor = new SequenceEditor('sequence', tree, seqList);

    // refresh the sequence list
    seqEditor.refreshSequenceList();

    // if there is at least 1 sequence, select the first
    if(seqEditor.sequenceList.length > 0) {
      seqEditor.selectSequence(seqEditor.sequenceList.sequences[0]);
    }
  });

  // Send an IPC async msg to main.js: request init data
  ipcRenderer.send('SequenceEditor-initDataReq');

  // bootstrap tooltip initialization
  $('[data-toggle="tooltip"]').tooltip({
    delay: {show: 1000, hide: 100}
  });
});
