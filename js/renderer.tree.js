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
      let popupData = {
         title      : 'Save before exit?',
         width      : 500,
         height     : 180,
         sender     : 'tree',
         content    : `<strong>You have made changes which were not saved.</strong><br />
         Do you want to save before exiting ?`,
         btn_ok     : 'Save and exit',
         btn_cancel : 'Exit without saving'
      };
      const {ipcRenderer} = require('electron');
      let saveBeforeExit = ipcRenderer.sendSync('popup-request', popupData);

      // save if asked
      if (saveBeforeExit) {
         app.save();
      }
   }

   // close and exit
   window.onbeforeunload = null;
   window.close();
};
