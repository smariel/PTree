// -----------------------------------------------------------------------------
// Main Process
// -----------------------------------------------------------------------------

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
// Node.js module to work with  paths
const path = require('path');
// The package.json file
const packagejson = require('./package.json');

// Keep a global reference of the renderers data
// to avoid JS garbage collector to close them automatically
let renderers = {
  PTree          : { browserWindow:null, initData: {fileToOpen: null, checkUpdate: true, enableLock: true, enableBackup: true}  },
  itemEditor     : { browserWindow:null, initData: null, returnData: null, reqEvent: null },
  partListEditor : { browserWindow:null, initData: null, returnData: null, reqEvent: null },
  stats          : { browserWindow:null, initData: null, returnData: null,                },
  popup          : { browserWindow:null, initData: null, returnData: null, reqEvent: null },
  about          : { browserWindow:null,                                                  },
};

// debug global var
let debug = false;

console.info(`\n------------`); // eslint-disable-line no-console
console.info(`${packagejson.name} v${packagejson.version}`); // eslint-disable-line no-console
console.info(`------------\n\nOptions:`); // eslint-disable-line no-console

// parsing arguments using node.js process module
// ignore the first argument which is the app location
for (let i=1; i<process.argv.length; i++) {
  let arg = process.argv[i];

  // if the arg is an option starting with --
  if('--' == arg.substring(0, 2)) {
    // Debug mode
    if('--debug' == arg || '-d' == arg) {
      debug = true;
      console.info(`--debug`); // eslint-disable-line no-console
    }
    // Don't check for update
    else if('--no-update-check' == arg || '-c' == arg) {
      renderers.PTree.initData.checkUpdate = false;
      console.info(`--no-update-check`); // eslint-disable-line no-console
    }
    // Don't create a backup of the edited file
    else if('--no-backup' == arg || '-b' == arg) {
      renderers.PTree.initData.enableBackup = false;
      console.info(`--no-backup`); // eslint-disable-line no-console
    }
    // Don't lock the edited file
    else if('--no-lock' == arg || '-k' == arg) {
      renderers.PTree.initData.enableLock = false;
      console.info(`--no-lock`); // eslint-disable-line no-console
    }
    // Print the help and exit
    else if('--help' == arg || '-h' == arg) {
      let help = `--help\n`;
      help    += 'Available options are:\n';
      help    += '  -c, --no-update-check   Disables the update check at startup\n';
      help    += '  -d, --debug             Enable the chromium debug tools\n';
      help    += '  -h, --help              Print this help\n';
      help    += '  -b, --no-backup         Disable the automatic backup of the file being edited\n';
      help    += '  -k, --no-lock           Disable the lock of the file being edited\n';
      console.info(help); // eslint-disable-line no-console
      process.exit();
    }
    else {
      console.info(`${arg} (unrecognized option, ignored)`); // eslint-disable-line no-console
    }
  }
  // If the arg is a valid path to a ptree project file (also Windows "open with" command)
  else if(fs.existsSync(arg) && fs.statSync(arg).isFile() && '.ptree' == path.extname(arg)) {
    // add the path to the init data of the PTree renderer
    renderers.PTree.initData.fileToOpen = arg;
  }
}


// Quit the app when all windows are closed.
app.on('window-all-closed', () => {
  process.exit();
});


// macOS : file open while the app is running or dropped on the app icon
app.on('open-file', (evt, filepath) => {
  // test if the received path is a file
  if(fs.statSync(filepath).isFile() && '.ptree' == path.extname(filepath)) {
    // if the PTree window does not exist yet
    if(undefined === renderers.PTree.browserWindow || null === renderers.PTree.browserWindow) {
      // save the file path to be sent later
      renderers.PTree.initData.fileToOpen = filepath;
    }
    // else if the PTree window exist
    else {
      // send the file path
      renderers.PTree.browserWindow.webContents.send('PTree-openFile', filepath);
    }
  }
});


// check the creation of new webContents
app.on('web-contents-created', (event, contents) => {
  // Security: navigation disabled for all renderers
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // Security: disable the creation of additional windows
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});


// -----------------------------------------------------------------------------
// TREE
// -----------------------------------------------------------------------------

// When Electron has finished initialization
app.on('ready', () => {
  // Security : denies all permissions request
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    return callback(false);
  });

  // Create the browser window.
  renderers.PTree.browserWindow = new BrowserWindow({
    width          : 1200,
    height         : 800,
    minWidth       : 800,
    webPreferences : {nodeIntegration : true}
  });

  // and load the index.html of the app.
  renderers.PTree.browserWindow.loadURL(`file://${__dirname}/html/PTree.html`);

  // Open the dev tools...
  if (debug) renderers.PTree.browserWindow.webContents.openDevTools({mode: 'detach'});

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
            openAboutWindow();
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
    } : {label: ''},
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
  let menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

// IPC async msg received from PTree : request for init data
ipcMain.on('PTree-initDataReq', (evt) => {
  // send back the requested data
  evt.sender.send('PTree-initDataResp', renderers.PTree.initData);
});

// IPC async msg received from PTree : ready to close
ipcMain.on('PTree-beforeCloseReturn', (evt, isPTreeReady) => {
  // quit the app by killing the main process
  if(isPTreeReady) process.exit();
});


// -----------------------------------------------------------------------------
// ITEM EDITOR
// -----------------------------------------------------------------------------

// IPC async msg received from Item : request edition
ipcMain.on('Item-editReq', (evt, itemStr, itemType) => {
  // save the given itemStr for future async use
  renderers.itemEditor.initData = {itemStr};
  // save the event to respond to this msg later
  renderers.itemEditor.reqEvent = evt;

  // Create the itemEditor window
  renderers.itemEditor.browserWindow = new BrowserWindow({
    width           : ('source' == itemType) ? 1000 : 650,
    height          : ('source' == itemType) ? 720 : 485,
    parent          : renderers.PTree.browserWindow,
    modal           : true,
    resizable       : false,
    autoHideMenuBar : true,
    useContentSize  : true,
    webPreferences  : {nodeIntegration : true}
  });

  // Open the dev tools...
  if (debug) renderers.itemEditor.browserWindow.webContents.openDevTools({mode: 'detach'});

  // Load the *.html of the window.
  renderers.itemEditor.browserWindow.loadURL(`file://${__dirname}/html/itemEditor.html`);

  // Emitted when the window is closed.
  renderers.itemEditor.browserWindow.on('closed', () => {
    // send back the new data to the Item
    renderers.itemEditor.reqEvent.sender.send('Item-editResp', renderers.itemEditor.returnData);
    // Dereference the window object, initData and returnData
    renderers.itemEditor.browserWindow = null;
    renderers.itemEditor.initData      = null;
    renderers.itemEditor.returnData    = null;
    renderers.itemEditor.reqEvent      = null;
  });
});

// IPC async msg received from ItemEditor : request for init data
ipcMain.on('ItemEditor-initDataReq', (evt) => {
  // send back the requested data
  evt.sender.send('ItemEditor-initDataResp',renderers.itemEditor.initData);
});

// IPC async msg received from ItemEditor : edited data returned
ipcMain.on('ItemEditor-returnData', (evt, newitemStr) => {
  // save the returned data to be sent when window is closed
  renderers.itemEditor.returnData = newitemStr;
});


// -----------------------------------------------------------------------------
// PART LIST EDITOR
// -----------------------------------------------------------------------------

// IPC async msg received from PTree : request partList edition
ipcMain.on('PartList-editReq', (evt, treeStr, partListStr) => {
  // macOS: PTree window is disabled (hidden) while the partlist is open
  // windows: the partlist is modal and automatically disable the other
  if(process.platform === 'darwin') renderers.PTree.browserWindow.hide();
  // save the given data for future async use
  renderers.partListEditor.initData = {treeStr, partListStr};
  // save the event to respond to this msg later
  renderers.partListEditor.reqEvent = evt;

  // Create the partListEditor window
  renderers.partListEditor.browserWindow = new BrowserWindow({
    width           : 1024,
    height          : 768,
    parent          : renderers.PTree.browserWindow,
    modal           : process.platform !== 'darwin',
    resizable       : true,
    useContentSize  : true,
    webPreferences  : {nodeIntegration : true}
  });

  // Open the dev tools...
  if (debug) renderers.partListEditor.browserWindow.webContents.openDevTools({mode: 'detach'});

  // Load the *.html of the window.
  renderers.partListEditor.browserWindow.loadURL(`file://${__dirname}/html/partListEditor.html`);

  // Emitted when the window is closed.
  renderers.partListEditor.browserWindow.on('closed', () => {
    // enable PTree main window on macOS
    if(process.platform === 'darwin') renderers.PTree.browserWindow.show();
    // send back the new data to the Item
    renderers.partListEditor.reqEvent.sender.send('PartList-editResp', renderers.partListEditor.returnData);
    // Dereference the window object, initData and returnData
    renderers.partListEditor.browserWindow = null;
    renderers.partListEditor.initData      = null;
    renderers.partListEditor.returnData    = null;
    renderers.partListEditor.reqEvent      = null;
  });
});

// IPC async msg received from PartListEditor : request for init data
ipcMain.on('PartListEditor-initDataReq', (evt) => {
  // send back the requested data
  evt.sender.send('PartListEditor-initDataResp', renderers.partListEditor.initData);
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
      alwaysOnTop     : true,
      webPreferences  : {nodeIntegration : true}
    });
  }

  // Open the dev tools...
  if (debug) renderers.stats.browserWindow.webContents.openDevTools({mode: 'detach'});

  // Load the *.html of the window.
  renderers.stats.browserWindow.loadURL(`file://${__dirname}/html/stats.html`);

  // Emitted when the window is closed.
  renderers.stats.browserWindow.on('closed', () => {
    // Dereference the window object, initData and returnData
    renderers.stats.browserWindow = null;
    renderers.stats.browserWindow = null;
    renderers.stats.initData      = null;
  });
});

// IPC async msg received from Stats : request for init data
ipcMain.on('Stats-initDataReq', (evt) => {
  // send back the requested data
  evt.sender.send('Stats-initDataResp', renderers.stats.initData);
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

// IPC async msg received from anywhere : request to open a popup (and return state)
ipcMain.on('Popup-openReq', (evt, popupData) => {
  if(renderers.PTree.browserWindow.isDestroyed()) return;
  // save the given data for future async use
  renderers.popup.initData = popupData;
  // save the event to respond to this msg later
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
    webPreferences  : {nodeIntegration : true}
  });

  // Open the dev tools...
  if (debug) renderers.popup.browserWindow.webContents.openDevTools({mode: 'detach'});

  // Load the *.html of the window.
  renderers.popup.browserWindow.loadURL(`file://${__dirname}/html/popup.html`);

  // Emitted when the window is closed.
  renderers.popup.browserWindow.on('closed', () => {
    // send back the new data
    renderers.popup.reqEvent.sender.send('Popup-openResp', renderers.popup.returnData);
    // Dereference the window object, initData and returnData
    renderers.popup.browserWindow = null;
    renderers.popup.initData      = null;
    renderers.popup.returnData    = null;
    renderers.popup.reqEvent      = null;
  });
});

// IPC async msg received from Popup : request for init data
ipcMain.on('Popup-initDataReq', (evt) => {
  evt.sender.send('Popup-initDataResp', renderers.popup.initData);
});

// IPC async msg received from Popup : popup data returned
ipcMain.on('Popup-returnData', (evt, returnData) => {
  // save the returned data to be sent when window is closed
  renderers.popup.returnData = returnData;
});


// -----------------------------------------------------------------------------
// ABOUT
// -----------------------------------------------------------------------------

// function to open the about window
let openAboutWindow = () => {
  // if the window is already open, return
  if(null !== renderers.about.browserWindow) return;

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
      titleBarStyle   : 'hiddenInset',
      webPreferences  : {nodeIntegration : true}
    });

    // Open the dev tools...
    if (debug) renderers.about.browserWindow.webContents.openDevTools({mode: 'detach'});

    // Load the *.html of the window.
    renderers.about.browserWindow.loadURL(`file://${__dirname}/html/about.html`);

    // Emitted when the window is closed.
    renderers.about.browserWindow.on('closed', () => {
      // Dereference the window object
      renderers.about.browserWindow = null;
    });
  }
};

// IPC async msg received : open the about window
ipcMain.on('About-openReq', () => {
  openAboutWindow();
});
