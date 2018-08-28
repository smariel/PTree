// Electron Module
const electron = require('electron');
// Electron module to control application life.
const app = electron.app;
// Electron module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// Electron module to send/receive message with all renderers
const ipcMain = electron.ipcMain;
// Node.js module to access File System
const fs = require('fs');
// The package.json file
const packagejson = require('./package.json');

// Keep a global reference of the renderers data
// to avoid JS garbage collector to close them automatically
let renderers = {
   PTree          : { browserWindow:null, initData: {fileToOpen: null},                    },
   itemEditor     : { browserWindow:null, initData: null, returnData: null, reqEvent: null },
   partListEditor : { browserWindow:null, initData: null, returnData: null, reqEvent: null },
   stats          : { browserWindow:null, initData: null, returnData: null,                },
   popup          : { browserWindow:null, initData: null, returnData: null, reqEvent: null },
   about          : { browserWindow:null,                                                  },
};

// debug global var
let debug = false;


// parsing arguments using node.js process module
// ignore the first argument which is the app location
for (let i=1; i<process.argv.length; i++) {
   let arg = process.argv[i];
   // Debug mode
   if('--debug' == arg) {
      debug = true;
      break;
   }
   // Open files passed as argument or, on Windows, files "open with" PTree
   else if(fs.statSync(arg).isFile()) {
      renderers.PTree.initData.fileToOpen = arg;
   }
}


// Quit the app when all windows are closed.
app.on('window-all-closed', () => {
   process.exit();
});


// macOS : file open while the app is running or dropped on the app icon
app.on('open-file', (evt, path) => {
   // test if the received path is a file
   if(fs.statSync(path).isFile()) {
      // if the PTree window does not exist yet
      if(undefined === renderers.PTree.browserWindow || null === renderers.PTree.browserWindow) {
         // save the file path to be sent later
         renderers.PTree.initData.fileToOpen = path;
      }
      // else if the PTree window exist
      else {
         // send the file path
         renderers.PTree.browserWindow.webContents.send('PTree-openFile', path);
      }
   }
});


// -----------------------------------------------------------------------------
// TREE
// -----------------------------------------------------------------------------

// When Electron has finished initialization
app.on('ready', () => {
   // Create the browser window.
   renderers.PTree.browserWindow = new BrowserWindow({
      width    : 1200,
      height   : 800,
      minWidth : 800
   });

   // and load the index.html of the app.
   renderers.PTree.browserWindow.loadURL(`file://${__dirname}/html/PTree.html`);

   // Open the dev tools...
   if (debug) renderers.PTree.browserWindow.webContents.openDevTools();

      // Emitted just before closing the window
   renderers.PTree.browserWindow.on('close', (evt) => {
      // do not close the window
      evt.preventDefault();
      // Send an IPC async msg to PTree: prepare to close
      renderers.PTree.browserWindow.webContents.send('PTree-beforeCloseCmd');
   });

   // configuration of the Application menu
   const {Menu} = require('electron');
   const template = [
      {
         label: 'Edit',
         submenu: [
            {role: 'undo'},
            {role: 'redo'},
            {type: 'separator'},
            {role: 'cut'},
            {role: 'copy'},
            {role: 'paste'},
            {role: 'delete'},
            {role: 'selectall'}
         ]
      },
      {
         role: 'window',
         submenu: [
            {role: 'minimize'},
            {role: 'close'}
         ]
      },
      {
         role: 'help',
         submenu: [
            {
               label: `About ${packagejson.name}`,
               click () {
                  // Create the about window if it doesn't exist
                  if(null === renderers.about.browserWindow) {
                     renderers.about.browserWindow = new BrowserWindow({
                        width           : 450,
                        height          : 420,
                        alwaysOnTop     : true,
                        resizable       : false,
                        autoHideMenuBar : true,
                        useContentSize  : true,
                        thickFrame      : true,
                        titleBarStyle   : 'hiddenInset'
                     });

                     // Open the dev tools...
                     if (debug) renderers.about.browserWindow.webContents.openDevTools();

                     // Load the *.html of the window.
                     renderers.about.browserWindow.loadURL(`file://${__dirname}/html/about.html`);

                     // Emitted when the window is closed.
                     renderers.about.browserWindow.on('closed', () => {
                        // Dereference the window object
                        renderers.about.browserWindow = null;
                     });
                  }
               }
            },
            {
               label: 'Bug report and enhancement request',
               click () {
                  require('electron').shell.openExternal('https://github.com/smariel/PTree/issues');
               }
            },
            // not compatible withe ASAR archive made when packaging with Electron Builder
            // because __dirname point to the archive that can not be treated as a real folder by shell.openItem
            // ASAR is prefered than this menu, even if ASAR may be disabled
            /*
            {
               label: 'Equation Summary',
               click () {
                  require('electron').shell.openItem(`${__dirname}/docs/equations.pdf`);
               }
            },
            */
         ]
      },
      (debug) ? {
      label: 'Debug',
         submenu: [
            {
               label: 'Reload',
               accelerator: 'CmdOrCtrl+R',
               click (item, focusedWindow) {
                  if (focusedWindow) focusedWindow.reload();
               }
            },
            {
               label: 'Toggle Developer Tools',
               accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
               click (item, focusedWindow) {
                  if (focusedWindow) focusedWindow.webContents.toggleDevTools();
               }
            }
         ]
      } : {},
   ];

   // menu add-ons for macOS
   if (process.platform === 'darwin') {
      template.unshift({
         label: app.getName(),
         submenu: [
            {role: 'hide'},
            {role: 'quit'}
         ]
      });
   }

   // set the menu
   menu = Menu.buildFromTemplate(template);
   Menu.setApplicationMenu(menu);
});

// IPC sync msg received from PTree : request for init data
ipcMain.on('PTree-initDataReq', (evt) => {
   // send back the requested data
   evt.returnValue = renderers.PTree.initData;
});

// IPC async msg received from PTree : ready to close
ipcMain.on('PTree-beforeCloseReturn', (evt, isPTreeReady) => {
   // quit the app by killing the main process
   if(isPTreeReady) process.exit();
});


// -----------------------------------------------------------------------------
// ITEM EDITOR
// -----------------------------------------------------------------------------

// IPC sync msg received from Item : request edition
ipcMain.on('Item-editReq', (evt, itemStr, itemType) => {
   // save the given itemStr for future async use
   renderers.itemEditor.initData = {itemStr};
   // save the event to respond to this sync msg later
   renderers.itemEditor.reqEvent = evt;

   // Create the itemEditor window
   renderers.itemEditor.browserWindow = new BrowserWindow({
      width           : ('source' == itemType) ? 840 : 600,
      height          : ('source' == itemType) ? 485 : 485,
      parent          : renderers.PTree.browserWindow,
      modal           : true,
      resizable       : false,
      autoHideMenuBar : true,
      useContentSize  : true
   });

   // Open the dev tools...
   if (debug) renderers.itemEditor.browserWindow.webContents.openDevTools();

   // Load the *.html of the window.
   renderers.itemEditor.browserWindow.loadURL(`file://${__dirname}/html/itemEditor.html`);

   // Emitted when the window is closed.
   renderers.itemEditor.browserWindow.on('closed', () => {
      // send back the new data to the Item
      renderers.itemEditor.reqEvent.returnValue = renderers.itemEditor.returnData;
      // Dereference the window object, initData and returnData
      renderers.itemEditor.browserWindow = null;
      renderers.itemEditor.initData      = null;
      renderers.itemEditor.returnData    = null;
   });
});

// IPC sync msg received from ItemEditor : request for init data
ipcMain.on('ItemEditor-initDataReq', (evt) => {
   // send back the requested data
   evt.returnValue = renderers.itemEditor.initData;
});

// IPC async msg received from ItemEditor : edited data returned
ipcMain.on('ItemEditor-returnData', (evt, newitemStr) => {
   // save the returned data to be sent when window is closed
   renderers.itemEditor.returnData = newitemStr;
});


// -----------------------------------------------------------------------------
// PART LIST EDITOR
// -----------------------------------------------------------------------------

// IPC sync msg received from PTree : request partList edition
ipcMain.on('PartList-editReq', (evt, treeStr, partListStr) => {
   // save the given data for future async use
   renderers.partListEditor.initData = {treeStr, partListStr};
   // save the event to respond to this sync msg later
   renderers.partListEditor.reqEvent = evt;

   // Create the partListEditor window
   renderers.partListEditor.browserWindow = new BrowserWindow({
      width           : 1024,
      height          : 768,
      parent          : renderers.PTree.browserWindow,
      modal           : process.platform !== 'darwin',
      resizable       : true,
      useContentSize  : true
   });

   // Open the dev tools...
   if (debug) renderers.partListEditor.browserWindow.webContents.openDevTools();

   // Load the *.html of the window.
   renderers.partListEditor.browserWindow.loadURL(`file://${__dirname}/html/partListEditor.html`);

   // Emitted when the window is closed.
   renderers.partListEditor.browserWindow.on('closed', () => {
      // send back the new data to the Item
      renderers.partListEditor.reqEvent.returnValue = renderers.partListEditor.returnData;
      // Dereference the window object, initData and returnData
      renderers.partListEditor.browserWindow = null;
      renderers.partListEditor.initData      = null;
      renderers.partListEditor.returnData    = null;
   });
});

// IPC sync msg received from PartListEditor : request for init data
ipcMain.on('PartListEditor-initDataReq', (evt) => {
   // send back the requested data
   evt.returnValue = renderers.partListEditor.initData;
});

// IPC async msg received from PartListEditor : edited data returned
ipcMain.on('PartListEditor-returnData', (evt, newPartListStr) => {
   // save the returned data to be sent when window is closed
   renderers.partListEditor.returnData = newPartListStr;
});


// -----------------------------------------------------------------------------
// STATS
// -----------------------------------------------------------------------------

// IPC async msg received from PTree : request to open the Stats
ipcMain.on('Stats-openReq', (evt, initData) => {
   // save the given data for future async use
   renderers.stats.initData = initData;

   // if the windows is already open
   if(renderers.stats.browserWindow !== null) {
      renderers.stats.browserWindow.focus();
      return;
   }
   else {
      // Create the  window
      renderers.stats.browserWindow = new BrowserWindow({
         width           : 800,
         height          : 400,
         resizable       : true,
         useContentSize  : true,
         alwaysOnTop     : true
      });
   }

   // Open the dev tools...
   if (debug) renderers.stats.browserWindow.webContents.openDevTools();

   // Load the *.html of the window.
   renderers.stats.browserWindow.loadURL(`file://${__dirname}/html/stats.html`);

   // Emitted when the window is closed.
   renderers.stats.browserWindow.on('closed', () => {
      // Dereference the window object, initData and returnData
      renderers.stats.browserWindow = null;
      renderers.popup.browserWindow = null;
      renderers.popup.initData      = null;
   });
});

// IPC sync msg received from Stats : request for init data
ipcMain.on('Stats-initDataReq', (evt) => {
   // send back the requested data
   evt.returnValue = renderers.stats.initData;
});

// IPC async msg received from PTree : request to update the Stats with the given data
ipcMain.on('Stats-updateItemReq', (evt, data) => {
   // if the stats are open
   if(null !== renderers.stats.browserWindow) {
      // Send an IPC async msg to the Stats: ask to update with those data
      renderers.stats.browserWindow.webContents.send('Stats-updateItemCmd',data);
   }
});

// IPC async msg received from Stats : request to select a new item
ipcMain.on('PTree-selectItemReq', (evt, data) => {
   // Send an IPC async msg to PTree: select a new item
   renderers.PTree.browserWindow.webContents.send('PTree-selectItemCmd',data);
});



// -----------------------------------------------------------------------------
// POPUP
// -----------------------------------------------------------------------------

// IPC sync msg received from anywhere : request to open a popup (and return state)
ipcMain.on('Popup-openReq', (evt, popupData) => {
   // save the given data for future async use
   renderers.popup.initData = popupData;
   // save the event to respond to this sync msg later
   renderers.popup.reqEvent = evt;

   // Create the window
   renderers.popup.browserWindow = new BrowserWindow({
      title           : (undefined === popupData.title ) ? ''   : popupData.title,
      width           : (undefined === popupData.width ) ? 500  : popupData.width,
      height          : (undefined === popupData.height) ? 180  : popupData.height,
      parent          : (undefined === popupData.sender) ? null : renderers[popupData.sender].browserWindow,
      modal           : true,
      autoHideMenuBar : true,
      resizable       : false,
      minimizable     : false,
      maximizable     : false,
      useContentSize  : true,
   });

   // Open the dev tools...
   //if (debug) renderers.popup.browserWindow.webContents.openDevTools();

   // Load the *.html of the window.
   renderers.popup.browserWindow.loadURL(`file://${__dirname}/html/popup.html`);

   // Emitted when the window is closed.
   renderers.popup.browserWindow.on('closed', () => {
      // send back the new data
      renderers.popup.reqEvent.returnValue = renderers.popup.returnData;
      // Dereference the window object, initData and returnData
      renderers.popup.browserWindow = null;
      renderers.popup.initData      = null;
      renderers.popup.returnData    = null;
   });
});

// IPC sync msg received from Stats : request for init data
ipcMain.on('Popup-initDataReq', (evt) => {
   evt.returnValue = renderers.popup.initData;
});

// IPC async msg received from PartListEditor : popup data returned
ipcMain.on('Popup-returnData', (evt, returnData) => {
   // save the returned data to be sent when window is closed
   renderers.popup.returnData = returnData;
});
