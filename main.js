const debug = true;

const electron = require('electron');

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
// Module to send/receive message with all renderers
const {ipcMain} = require('electron');


// Keep a global reference of the window object to avaoid JS garbage collected to close them automatically
let appWindows = {
	tree      : null,
	item      : null,
	partTable : null,
   stats     : null,
   popup     : null
};


// When Electron has finished initialization
app.on('ready', () => {
	// Create the browser window.
	appWindows.tree = new BrowserWindow({
      width    : 1200,
      height   : 800,
      minWidth : 800
   });

	// and load the index.html of the app.
	appWindows.tree.loadURL(`file://${__dirname}/html/tree.html`);

   // Open the dev tools...
	if ((undefined !== debug) && debug) appWindows.tree.webContents.openDevTools();

	// Emitted when the window is closed.
	appWindows.tree.on('closed', function () {
		// Dereference the window object
		appWindows.tree = null;
      appWindows.stats = null;
      app.quit();
	});

   // configuration of the Application menu
	const {Menu} = require('electron');
	const template = [
		{
			label: 'Edit',
			submenu: [
				{
					role: 'undo'
				},
				{
					role: 'redo'
				},
				{
					type: 'separator'
				},
				{
					role: 'cut'
				},
				{
					role: 'copy'
				},
				{
					role: 'paste'
				},
				{
					role: 'delete'
				},
				{
					role: 'selectall'
				}
			]
		},
		{
			role: 'window',
			submenu: [
				{
					role: 'minimize'
				},
				{
					role: 'close'
				}
			]
		},
		{
			role: 'help',
			submenu: [
				{
					label: 'Equation Summary',
					click () {
                  require('electron').shell.openItem(`${__dirname}/docs/equations.pdf`);
               }
				},
			]
		},
      ((undefined !== debug) && debug) ? {
		label: 'View',
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
				{
					role: 'about'
				},
				{
					role: 'hide'
				},
				{
					role: 'quit'
				}
			]
		});
	}

   // set the menu
	menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
});


// Quit the app when all windows are closed.
app.on('window-all-closed', function () {
	app.quit();
});


// bind an event handler on a request to edit an item
// this request is sent synchronusly by an item object on the tree view
// so the tree view script is blocked untill it received a response
ipcMain.on('edit-request', function (itemEvent, itemdata) {
	// parse the data to resize the window
	var item = JSON.parse(itemdata);

	// Create the item window
	appWindows.item = new BrowserWindow({
		width           : ('source' == item.type) ? 800 : 400,
		height          : ('source' == item.type) ? 485 : 445,
		parent          : appWindows.tree,
		modal           : true,
		resizable       : false,
      autoHideMenuBar : true,
      useContentSize  : true
	});

	// Open the dev tools...
	if ((undefined !== debug) && debug) appWindows.item.webContents.openDevTools();

	// Load the *.html of the window.
	appWindows.item.loadURL(`file://${__dirname}/html/item.html`);

	// wait for the edit window to request the data, then send them
	ipcMain.once('edit-window-open-req', function(event_wopen, arg){
		event_wopen.sender.send('edit-window-open-resp', itemdata);
	});

	// wait for the edit window to send data when it closes
	ipcMain.once('edit-window-close', function(event_wclose, newitemdata) {
		// save those datas before sending them when the close event is trigged
		itemdata = newitemdata;
	});

	// Emitted when the window is closed.
	appWindows.item.on('closed', function () {
		// sent the (new or old) data to the tree window
		itemEvent.returnValue = itemdata;
		// Dereference the window object
		appWindows.item = null;
	});
});


// bind an event handler on a request to open the part list
// this request is sent synchronusly by the tree window
// so the tree script is blocked untill it received a response
ipcMain.on('partTable-request', function (partEvent, treeData, partlistData) {

	// Create the partTable window
	appWindows.partTable = new BrowserWindow({
		width           : 1024,
		height          : 768,
		parent          : appWindows.tree,
		modal           : process.platform !== 'darwin',
		resizable       : true,
      useContentSize  : true
	});

	// Open the dev tools...
	if ((undefined !== debug) && debug) appWindows.partTable.webContents.openDevTools();

	// Load the *.html of the window.
	appWindows.partTable.loadURL(`file://${__dirname}/html/partTable.html`);

	// wait for the window to request the data then send them
	ipcMain.once('partTable-window-open-req', function(event_wopen, arg){
		event_wopen.sender.send('partTable-window-open-resp', treeData, partlistData);
	});

	// wait for the edit window to send data when it closes
	ipcMain.once('partTable-window-close', function(event_wclose, newPartlistData) {
		// save the new data before sending them when the close event is trigged
		partlistData = newPartlistData;
	});

	// Emitted when the window is closed.
	appWindows.partTable.on('closed', function () {
		// sent the (new or old) data to the tree window
		partEvent.returnValue = partlistData;
		// Dereference the window object
		appWindows.partTable = null;
	});
});


// bind an event handler on a request to open the stats window
// this request is sent asynchronusly by the tree window
ipcMain.on('stats-request', function (statsEvent, data) {
   // if the windows is already open
   if(appWindows.stats !== null) {
      appWindows.stats.focus();
      return;
   }

	// Create the  window
	appWindows.stats = new BrowserWindow({
		width           : 800,
		height          : 400,
		resizable       : true,
      useContentSize  : true,
      alwaysOnTop     : true
	});

	// Open the dev tools...
	if ((undefined !== debug) && debug) appWindows.stats.webContents.openDevTools();

	// Load the *.html of the window.
	appWindows.stats.loadURL(`file://${__dirname}/html/stats.html`);

	// wait for the window to request the data then send them
	ipcMain.once('stats-window-open-req', function(event_wopen, arg){
		event_wopen.sender.send('stats-window-open-resp', data);
	});

	// Emitted when the window is closed.
	appWindows.stats.on('closed', function () {
		// Dereference the window object
		appWindows.stats = null;
	});
});

// inform the stats window (if open) that an item has been selected on the tree
ipcMain.on('stats-selectItem', function (event, data) {
   if(null !== appWindows.stats) {
      /*// wait for the window to request the data then send them
   	ipcMain.once('stats-window-open-req', function(event_wopen, arg){
   		event_wopen.sender.send('stats-window-open-resp', data);
   	});
      // reload the stats window
      appWindows.stats.webContents.reload();*/

      appWindows.stats.webContents.send('stats-selectItem',data);
   }
});

// inform the PTree window that an item has been selected on the stats
ipcMain.on('tree-selectItem', function (event, data) {
   appWindows.tree.webContents.send('tree-selectItem',data);
});


// bind an event handler on a request to open a generic popup with OK/Cancel commands
// this request is sent synchronusly by any window with a data object describing the popup
// when the popup opens, it ask main.js for the data
// when the popup is validates/closed, it send back the value of OK/CANCEL
// then main.js send back the OK/CANCEL value to the initiatior of the popup
// popupData has the following properties : title, width, height, sender, content, btn_ok, btn_cancel
ipcMain.on('popup-request', function (popupEvent, popupData) {
   // Create the window
   appWindows.popup = new BrowserWindow({
      title           : (undefined === popupData.title ) ? ''   : popupData.title,
      width           : (undefined === popupData.width ) ? 500  : popupData.width,
      height          : (undefined === popupData.height) ? 180  : popupData.height,
      parent          : (undefined === popupData.sender) ? null : appWindows[popupData.sender],
      modal           : true,
      autoHideMenuBar : true,
      resizable       : false,
      minimizable     : false,
      maximizable     : false,
      useContentSize  : true
   });

   // set as CANCEL by default
   var isOK = false;

	// Load the *.html of the window.
	appWindows.popup.loadURL(`file://${__dirname}/html/popup.html`);

   // wait for the popup to request the data then send them
	ipcMain.once('popup-open', function(event_wopen, response){
		event_wopen.returnValue = popupData;
	});

   // wait for the popup to send data when it closes
	ipcMain.once('popup-close', function(event_wclose, response) {
      isOK = response;
	});

   // Emitted when the window is closed.
	appWindows.popup.on('closed', function () {
		// send the command to the tree renderer which is waiting to close
		popupEvent.returnValue = isOK;
		// Dereference the window object
      appWindows.popup = null;
	});
});
