$(function() {
   // bootstrap tooltip initialization
   $('[data-toggle="tooltip"]').tooltip({
      delay: {
         show: 1000,
         hide: 100
      }
   });
});


// creation of the main app object
var app = new PTree('canvas');


// event before closing the window (on exit)
window.onbeforeunload = function() {
   // if the document is not saved, ask if it has to
   if (app.unsaved) {
      // request to the main process to open a window asking for saving
      // the request is synchronus to block this renderer untill the response
      const {ipcRenderer} = require('electron');
      let saveBeforeExit = ipcRenderer.sendSync('saveBeforeExit-request', null);

      // save if asked
      if (saveBeforeExit) {
         app.save();
      }
   }

   // close and exit
   window.onbeforeunload = null;
   window.close();
};
