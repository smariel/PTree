$(function() {
   // ask main.js for the data to print in the popup
   const {ipcRenderer} = require('electron');
   var popupData = ipcRenderer.sendSync('popup-open', null);

   // display the data
   $('.content').html(popupData.content);

   // popup type = list
   if(undefined !== popupData.type && 'list' === popupData.type) {
      $('.mybtn-cancel').remove();
      $('.mybtn-ok').html(popupData.btn_ok);

      for(let item of popupData.list) {
         $('#list').append(`<option>${item}</option>\n`);
      }
   }
   // popup type = OK/Cancel
   else {
      if(null === popupData.btn_ok)     $('.mybtn-ok').remove();
      else                              $('.mybtn-ok').html(popupData.btn_ok);

      if(null === popupData.btn_cancel) $('.mybtn-cancel').remove();
      else                              $('.mybtn-cancel').html(popupData.btn_cancel);
   }

   // prepare the close function to send back OK or CANCEL to main.js
   var close = function (isOK) {
      const {ipcRenderer} = require('electron');
      ipcRenderer.send('popup-close', isOK);
      window.close();
   };

   // close with OK
   $('.mybtn-ok').click(function () {
      if(undefined !== popupData.type && 'list' === popupData.type) {
         close($('#list option:selected').text());
      }
      else {
         close (true);
      }
   });

   // close with CANCEL
   $('.mybtn-cancel').click(function () {
      close (false);
   });

   // Trigger key press
   $(document).keydown(function(event) {
      // ESCAPE
      if (27 == event.which) {
         close(false);
      }
      // ENTER
      else if (13 == event.which) {
         close(true);
      }
   });

});
