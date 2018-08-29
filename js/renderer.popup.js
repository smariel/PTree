// -----------------------------------------------------------------------------
// Popup renderer script
// -----------------------------------------------------------------------------

// Security : disable window.eval() in this rendrer
window.eval = global.eval = function () {
  throw new Error(`This application does not support window.eval().`);
};

// Framworks and libraries
window.$ = window.jQuery = require('jquery');
const {ipcRenderer} = require('electron');

// Send an IPC sync msg to main.js: request init data
const popupData = ipcRenderer.sendSync('Popup-initDataReq');

// function to close the popup and returning the result
let close = (returnData) => {
  // Send an IPC async msg to main.js: return the popup data
  ipcRenderer.send('Popup-returnData', returnData);
  // close the window
  window.close();
};

// When jQuery is ready
$(() => {
  // display the data
  $('.content').html(popupData.content);

  // popup type = list
  if(undefined !== popupData.type && 'list' === popupData.type) {
    $('.mybtn-cancel').remove();
    $('.mybtn-ok').html(popupData.btn_ok);

    for(let item of popupData.list) {
      $('#list').append(`<option value=${item.val}>${item.text}</option>\n`);
    }
  }
  // popup type = OK/Cancel
  else {
    if(null === popupData.btn_ok)     $('.mybtn-ok').remove();
    else                              $('.mybtn-ok').html(popupData.btn_ok);

    if(null === popupData.btn_cancel) $('.mybtn-cancel').remove();
    else                              $('.mybtn-cancel').html(popupData.btn_cancel);
  }

  // close with OK
  $('.mybtn-ok').click(() => {
    if(undefined !== popupData.type && 'list' === popupData.type) {
      close($('#list option:selected').val());
    }
    else {
      close (true);
    }
  });

  // close with CANCEL
  $('.mybtn-cancel').click(() => {
    close (false);
  });

  // Trigger key press
  $(document).keydown((event) => {
    // ESCAPE
    if (27 == event.which) {
      if('list' !== popupData.type) {
        close(false);
      }
    }
    // ENTER
    else if (13 == event.which) {
      if(undefined !== popupData.type && 'list' === popupData.type) {
        close($('#list option:selected').text());
      }
      else {
        close (true);
      }
    }
  });
});
