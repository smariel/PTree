// -----------------------------------------------------------------------------
// General purpose functions
// -----------------------------------------------------------------------------


// return BLACK or WHITE based on bgcolor
// if color is light, return black. if color is dark, return white.
// yellow is considered lighter than other colors
function getOpositeBorW(color) {
   var color_hsl = fabric.Color.reHSLa.exec(new fabric.Color(color).toHsl());
   return ((parseInt(color_hsl[3]) > 70) || (parseInt(color_hsl[1]) > 50 && parseInt(color_hsl[1]) < 75 && parseInt(color_hsl[3]) > 45)) ? "#000000" : "#FFFFFF";

}


// Round a number with the specified number of decimal
//    round(12.48, 1) = 12.5
//    round(12.48, -1) = 10
function round(number, decimal) {
   return Math.round(number * Math.pow(10, decimal)) / Math.pow(10, decimal);
}


// Round a number with the specified number of decimal if > 1 or digits if < 1
//    round(12.4824, 2) = 12.48
//    round(0.00124, 2) = 0.0012
function smartRound(number, precision) {
   if(number > 1) return round(number,precision);
   else if (number == 0) return 0;
   let nb0 = -Math.floor(Math.log10(Math.abs(number)));
   return round(number,nb0+precision);
}


// Round a number with a SI prefix
// return the specified number of digits except useless 0
//    numberToSi(12345.6789, 3) = 12.3k
//    numberToSi(12345.6789, 4) = 12.34k
//    numberToSi(0.00123456789, 4) = 1.234m
//    numberToSi(0.00000012, 10) = 120n
function numberToSi(number, digits) {
   if (!$.isNumeric(number)) {
      console.log("Error, " + number + " is not a number");
      return 0;
   }

   if (undefined === digits) digits = 3;

   var prefix = {
      '7'  : 'Y',
      '6'  : 'Z',
      '5'  : 'P',
      '4'  : 'T',
      '3'  : 'G',
      '2'  : 'M',
      '1'  : 'k',
      '0'  : '',
      '-1' : 'm',
      '-2' : 'µ',
      '-3' : 'n',
      '-4' : 'p',
      '-5' : 'f',
      '-6' : 'a',
      '-7' : 'z',
      '-8' : 'y',
   };

   // reg exp:
   //    $0: input
   //    $1: input without power (y.yy for y.yye+xxx)
   //    $2: integer part of $1
   //    $3: coma of $1
   //    $4: decimal part of $1
   //    $5: power (e+,e- or undefined)
   //    $6: exponent (xxx for y.yye+xxx)
   var reg = /^-?(([0-9]+)(\.?)([0-9]*))(e[+-])?([0-9]*)/;
   var reg_result = reg.exec(number.toString());
   var i = 0;

   // if the number is a very big float (*10^xxx)
   if (undefined !== reg_result[5] && 'e+' == reg_result[5]) {
      result = reg_result[1] * Math.pow(10, (reg_result[6] % 3));
      i = parseInt(reg_result[6] / 3);
   }
   // if the number is a very small float (*10^-xxx)
   else if (undefined !== reg_result[5] && 'e-' == reg_result[5]) {
      result = reg_result[1] * Math.pow(10, ((reg_result[6] % 3) * 2) % 3);
      i = -(parseInt((reg_result[6] - 1) / 3) + 1);
   }
   // if the number is a normal float or integer
   else {
      if (number > 1 || number < -1) {
         i = parseInt((reg_result[2].length - 1) / 3);
      }
      else {
         var nbzero = reg_result[4].length - parseInt(reg_result[4]).toString().length;
         i = -(parseInt((nbzero) / 3) + 1);
      }

      result = Math.abs(number) / Math.pow(10, i * 3);

   }

   // round the number
   result = round(result, (digits - parseInt(result).toString().length));
   if (number < 0) result *= -1;

   return result + prefix[i];
}


// Downoad an item passed as a dataURL object
function downloadDataURL(dataURL, fileName) {
   // Create an invisible <a> and force a download on it
   var temporaryElement      = document.createElement('a');
   temporaryElement.style    = "display: none";
   temporaryElement.href     = dataURL;
   temporaryElement.download = fileName;
   document.body.appendChild(temporaryElement);
   temporaryElement.click();
   document.body.removeChild(temporaryElement);
   window.URL.revokeObjectURL(dataURL);
}


// Download a data in file
function downloadData(data, fileName) {
   var blob = new Blob([data], {
      type: "application/octet-stream"
   });
   var dataURL = URL.createObjectURL(blob);
   downloadDataURL(dataURL, fileName);
}


// Download a table in a fileName
// require jQuery and XLSX to be included
function downloadTable(jQuery_table, fileName) {
   // Create a workbook from the table passed as a jQuery element
   // this entire code is from the XLSX documentation...
   const XLSX = require('xlsx');
   var workbook = XLSX.utils.table_to_book(jQuery_table[0]);
   var wopts = {
      bookType: 'xlsx',
      bookSST:  false,
      type:     'binary'
   };
   var wbout = XLSX.write(workbook, wopts);

   function s2ab(s) {
      var buf  = new ArrayBuffer(s.length);
      var view = new Uint8Array(buf);
      for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
      return buf;
   }
   var data = s2ab(wbout);

   // download the data into a file
   downloadData(data, fileName);
}


// create the specified number of HSL colors from main_color
// main_color must be [H,S,L]
function getHSLcolorset(main_color, color_number)
{
	var colors = [];
	var space = parseInt(360/color_number);

	for(var i=0; i<color_number; i+=1) {
		var hue = main_color[0]+(space*i);
		colors.push('hsl('+hue+', '+main_color[1]+'%, '+main_color[2]+'%)');
	}

	return colors;
}


// ask main.js to open a popup (OK/CANCEL by default)
// data = {type (string), title (string), width (int), height (int), sender (string), content (string), btn_ok (string), btn_cancel (string)}
// where data.type must be :
//   undefined (optional) => OK/CANCEL                  => return BOOL => no additional data
//   list                 => list selection + OK/CANCEL => return INT  => additional data.list (array)
function popup(popupData) {
   const {ipcRenderer} = require('electron');
   return ipcRenderer.sendSync('popup-request', popupData);
}


// Compare two arrays by adding a new methode Array
// Warn if overriding existing method
if (Array.prototype.equals) {
   console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or a double inclusions in this code.");
}
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function(array) {
   // if the other array is a falsy value, return
   if (!array) {
      return false;
   }

   // compare lengths - can save a lot of time
   if (this.length != array.length) {
      return false;
   }

   for (var i = 0, l = this.length; i < l; i++) {
      // Check if we have nested arrays
      if (this[i] instanceof Array && array[i] instanceof Array) {
         // recurse into the nested arrays
         if (!this[i].equals(array[i]))
            return false;
      } else if (this[i] != array[i]) {
         // Warning - two different object instances will never be equal: {x:20} != {x:20}
         return false;
      }
   }
   return true;
};
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {
   enumerable: false
});


// get a sheet as JSON object from a file
// popup the user if multiple tabs found
function getSpreadsheet(path=null, return_path=false, sender='PTree') {
   // of no path given, ask the user
   if (null === path) {
      // open a dialog
      const {dialog} = require('electron').remote;
      var paths = dialog.showOpenDialog({
         title: 'Select a spreadsheet',
         filters: [
            {name: 'Spreadsheet', extensions: ['xls','xlsx','csv']},
            {name: 'All Files',   extensions: ['*']}
         ],
         properties: ['openFile']
      });

      // exit if the path is undefined (canceled)
      if(undefined === paths) return null;
      path = paths[0];
   }

   // construct a workbook from the file
   const XLSX = require('xlsx');
   let workbook = XLSX.readFile(path);

   // If there are multiple tabs in the file, ask the user
   let sheetName  = '';
   if(workbook.SheetNames.length > 1) {
      let popupData = {
         type       : 'list',
         title      : 'Choose a sheet',
         width      : 500,
         height     : 135,
         sender     : sender,
         content    : `Multiple sheets found in this document.<br />Please choose one: <select id="list"></select>`,
         btn_ok     : 'Choose',
         list       : workbook.SheetNames
      };
      sheetName  = popup(popupData);
   }
   else {
      sheetName  = workbook.SheetNames[0];
   }

   // translate the sheet to JSON, convert empty values to 0, starting by A1 even if empty
   let sheet      = workbook.Sheets[sheetName];
   let sheet_json = XLSX.utils.sheet_to_json(sheet, {header:1, defval:0, range:'A1:'+sheet['!ref'].split(':')[1]});

   // return
   if(return_path) return {sheet:sheet_json, path:path};
   return sheet_json;
}


// compare two versions as strings like "1.3.4"
// return 0 if v1=v2, 1 if v1>v2, -1 if v1<v2
function compareVersions(v1, v2) {
   if(v1 === v2) return 0;

   v1 = v1.split('.');
   v2 = v2.split('.');

   if(
      v1[0]   >  v2[0] ||
      (v1[0] === v2[0] && v1[1]  >  v2[1]) ||
      (v1[0] === v2[0] && v1[1] === v2[1]  && v1[2] > v2[2])) {
      return 1;
   }
   else if(
      v1[0]   <  v2[0] ||
      (v1[0] === v2[0] && v1[1]  <  v2[1]) ||
      (v1[0] === v2[0] && v1[1] === v2[1]  && v1[2] < v2[2])) {
      return -1;
   }

   return null;
}
