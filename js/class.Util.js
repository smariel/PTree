// -----------------------------------------------------------------------------
// General purpose Utilities
// -----------------------------------------------------------------------------

class Util {

  // -----------------------------------------------------------------------------
  // Colors
  // -----------------------------------------------------------------------------

  // return BLACK or WHITE based on bgcolor
  // if color is light, return black. if color is dark, return white.
  // yellow is considered lighter than other colors
  static getOpositeBorW(color) {
    const {fabric} = require('fabric');
    let color_hsl = fabric.Color.reHSLa.exec(new fabric.Color(color).toHsl());
    return ((parseInt(color_hsl[3]) > 70) || (parseInt(color_hsl[1]) > 50 && parseInt(color_hsl[1]) < 75 && parseInt(color_hsl[3]) > 45)) ? '#000000' : '#FFFFFF';
  }


  // pick the color between color1 and color2 at the given weight
  // colors are RGB arrays and weitht is 0 to 1
  static pickColorRgb(color1, color2, weight) {
    let p   = weight;
    let w   = p * 2 - 1;
    let w1  = (w/1+1) / 2;
    let w2  = 1 - w1;
    let rgb = [
      Math.round(color1[0] * w1 + color2[0] * w2),
      Math.round(color1[1] * w1 + color2[1] * w2),
      Math.round(color1[2] * w1 + color2[2] * w2)
    ];
    return rgb;
  }


  // same as pickRgb with Hex colors
  // needs Fabricjs
  static pickColorHex(color1, color2, weight) {
    const {fabric} = require('fabric');
    let color1rgb = fabric.Color.fromHex(color1).getSource();
    let color2rgb = fabric.Color.fromHex(color2).getSource();
    let resultrgb = Util.pickColorRgb(color1rgb, color2rgb, weight);
    let resulthex = fabric.Color.fromSource(resultrgb).toHex();
    return '#'+resulthex;
  }


  // create the specified number of HSL colors from main_color
  // main_color must be [H,S,L]
  static getHSLcolorset(main_color, color_number) {
    let colors = [];
    let space = parseInt(360/color_number);

    for(let i=0; i<color_number; i+=1) {
      let hue = main_color[0]+(space*i);
      colors.push('hsl('+hue+', '+main_color[1]+'%, '+main_color[2]+'%)');
    }

    return colors;
  }

  // return the blackbody color (temperature color grade)
  // with x = 0 to 1
  // source1 : http://www.vendian.org/mncharity/dir3/blackbody/
  // source2 : https://en.wikipedia.org/wiki/Color_temperature
  static getBlackbodyColor(x) {
    // get all colors, only once thanks to require
    Util.blackbodyColor = require('./color.blackbody.json');

    // get the blackbody color from 1000K (x=0) to 12000K (x=1)
    // corresponding to the daylight color grade
    const color = this.blackbodyColor[Math.round((-x+1)*221)];
    return color.hex;
  }


  // return the metal tempering color
  // with x = 0 to 1
  // made approximatively from https://en.wikipedia.org/wiki/Tempering_(metallurgy)
  static getMetalColor(x) {
    // get all colors, only once thanks to require
    Util.metalColor = require('./color.metaltempering.json');

    // get the color, excluding too black or too white colors
    const color = this.metalColor[Math.round((-x+1)*299)];
    return color.hex;
  }


  // -----------------------------------------------------------------------------
  // Math & number formating
  // -----------------------------------------------------------------------------

  // Round a number with the specified number of decimal
  //    round(12.48, 1) = 12.5
  //    round(12.48, -1) = 10
  static round(number, decimal) {
    return Math.round(number * Math.pow(10, decimal)) / Math.pow(10, decimal);
  }


  // Round a number with the specified number of decimal if > 1 or digits if < 1
  //    round(12.4824, 2) = 12.48
  //    round(0.00124, 2) = 0.0012
  static smartRound(number, precision) {
    if(number > 1) return Util.round(number,precision);
    else if (number == 0) return 0;
    let nb0 = -Math.floor(Math.log10(Math.abs(number)));
    return Util.round(number,nb0+precision);
  }


  // Round a number with a SI prefix
  // return the specified number of digits except useless 0
  //    numberToSi(12345.6789, 3) = 12.3k
  //    numberToSi(12345.6789, 4) = 12.34k
  //    numberToSi(0.00123456789, 4) = 1.234m
  //    numberToSi(0.00000012, 10) = 120n
  static numberToSi(number, digits) {
    if (isNaN(number)) {
      console.warn(`numberToSi: ${number} is not a number`);
      return 0;
    }
    else if (Infinity == number || number >= Number.MAX_SAFE_INTEGER) {
      return '∞';
    }
    else if (-Infinity == number || number <= -Number.MAX_SAFE_INTEGER) {
      return '-∞';
    }

    if (undefined === digits) digits = 3;

    let prefix = {
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
    let reg = /^-?(([0-9]+)(\.?)([0-9]*))(e[+-])?([0-9]*)/;
    let reg_result = reg.exec(number.toString());
    let i = 0;
    let result = 0;

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
        let nbzero = reg_result[4].length - parseInt(reg_result[4]).toString().length;
        i = -(parseInt((nbzero) / 3) + 1);
      }

      result = Math.abs(number) / Math.pow(10, i * 3);
    }

    // round the number
    result = Util.round(result, (digits - parseInt(result).toString().length));
    if (number < 0) result *= -1;

    return result + prefix[i];
  }


  // use linear interpolation to return y=ax+b based on two points x1/y1 and x2/y2
  static linearInterpol(x1, y1, x2, y2, x) {
    let a = (y2 - y1) / (x2 - x1);
    let b = y1 - a * x1;
    return a * x + b;
  }


  // generate a random number
  static randomHex(depth) {
    return Math.floor(Math.random()*Math.pow(2,depth)).toString(16);
  }


  // -----------------------------------------------------------------------------
  // Download data
  // -----------------------------------------------------------------------------

  // Downoad an item passed as a dataURL object
  static downloadDataURL(dataURL, fileName) {
    // Create an invisible <a> and force a download on it
    let temporaryElement      = document.createElement('a');
    temporaryElement.style    = 'display: none';
    temporaryElement.href     = dataURL;
    temporaryElement.download = fileName;
    document.body.appendChild(temporaryElement);
    temporaryElement.click();
    document.body.removeChild(temporaryElement);
    window.URL.revokeObjectURL(dataURL);
  }


  // Download a data in file
  static downloadData(data, fileName) {
    let blob = new Blob([data], {
      type: 'application/octet-stream'
    });
    let dataURL = URL.createObjectURL(blob);
    Util.downloadDataURL(dataURL, fileName);
  }


  // Download a table in a spreadsheet
  static downloadTable(jQuery_table, fileName) {
    // Create an XLSX workbook from the HTML table
    const XLSX = require('xlsx');
    let workbook = XLSX.utils.table_to_book(jQuery_table[0]);

    // Write the XLSX file
    let options = {
      bookType: 'xlsx',
      bookSST:  false,
      type:     'array'
    };
    let workbook_data = XLSX.write(workbook, options);

    // download the data into a file
    Util.downloadData(workbook_data, fileName);
  }



  // -----------------------------------------------------------------------------
  // Comparison
  // -----------------------------------------------------------------------------


  // compare two versions as strings like '1.3.4'
  // return 0 if v1=v2, 1 if v1>v2, -1 if v1<v2
  static compareVersions(v1, v2, level=3) {
    if(v1 === v2) return 0;

    v1 = v1.split('.');
    v2 = v2.split('.');

    if(
      (v1[0]  >  v2[0] && level >= 1) ||
      (v1[0] === v2[0] && v1[1]  >  v2[1] && level >= 2) ||
      (v1[0] === v2[0] && v1[1] === v2[1]  && v1[2] > v2[2]) && level >= 3) {
      return 1;
    }
    else if(
      (v1[0]   <  v2[0] && level >= 1) ||
      (v1[0] === v2[0] && v1[1]  <  v2[1] && level >= 2) ||
      (v1[0] === v2[0] && v1[1] === v2[1]  && v1[2] < v2[2]) && level >= 3) {
      return -1;
    }

    return 0;
  }

  // -----------------------------------------------------------------------------
  // Other
  // -----------------------------------------------------------------------------


  // ask main.js to open a popup (OK/CANCEL by default)
  // data = {type (string), title (string), width (int), height (int), sender (string), content (string), btn_ok (string), btn_cancel (string)}
  // where data.type must be :
  //   undefined (optional) => OK/CANCEL           => return BOOL => no additional data
  //   list                 => list selection + OK => return TXT  => additional data.list (array [{val:xxx, text:xxx}, {}...])
  static popup(popupData) {
    return new Promise(resolve => {
      const {ipcRenderer} = require('electron');

      // listen to the response from main.js and resolve the promise
      ipcRenderer.once('Popup-openResp', (event, data) => {
        resolve(data);
      });

      // Send an IPC async msg to main.js: open a popup with the given data
      ipcRenderer.send('Popup-openReq', popupData);
    });
  }


  // get a sheet as JSON object from a file
  // popup the user if multiple tabs found
  static async getSpreadsheet(path=null, return_path=false, sender='PTree') {
    // of no path given, ask the user
    if (null === path) {
      // open a dialog
      const {dialog} = require('electron').remote;
      let paths = dialog.showOpenDialogSync({
        title: 'Select a spreadsheet',
        filters: [
          {name: 'Spreadsheet', extensions: ['xls','xlsx','csv']},
          {name: 'All Files',   extensions: ['*']}
        ],
        properties: ['openFile']
      });

      // exit if the path is undefined (canceled)
      if(undefined === paths) {
        return null;
      }
      else {
        path = paths[0];
      }
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
        content    : 'Multiple sheets found in this document.<br />Please choose one: <select id="list"></select>',
        btn_ok     : 'Choose',
        list       : workbook.SheetNames.map((name) => {return {val:name, text:name};})
      };
      sheetName  = await Util.popup(popupData);
    }
    else {
      sheetName  = workbook.SheetNames[0];
    }

    // translate the sheet to JSON, convert empty values to 0, starting by A1 even if empty
    let sheet = workbook.Sheets[sheetName];
    let sheet_json = [];
    if(undefined !== sheet['!ref']) {
      sheet_json = XLSX.utils.sheet_to_json(sheet, {header:1, defval:0, range:'A1:'+sheet['!ref'].split(':')[1]});
    }

    // return
    if(return_path) return {sheet:sheet_json, path:path};
    return sheet_json;
  }

}

module.exports = Util;


// Compare two arrays by adding a new methode Array
// Warn if overriding existing method
if (Array.prototype.equals) {
  console.warn('Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there\'s a framework conflict or a double inclusions in this code.');
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

  for (let i = 0, l = this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i])) return false;
    }
    else if (this[i] != array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
};
// Hide method from for-in loops
Object.defineProperty(Array.prototype, 'equals', {
  enumerable: false
});
