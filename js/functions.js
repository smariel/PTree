// -----------------------------------------------------------------------------
// General purpose functions
// -----------------------------------------------------------------------------


// return BLACK or WHITE based on bgcolor
// if color is light, return black. if color is dark, return white.
// yellow is considered lighter than other colors
function getOpositeBorW(color)
{
	var color_hsl = fabric.Color.reHSLa.exec(new fabric.Color(color).toHsl());
	return ((parseInt(color_hsl[3]) > 70) || (parseInt(color_hsl[1]) > 50 && parseInt(color_hsl[1]) < 75 && parseInt(color_hsl[3]) > 45)) ? "#000000" : "#FFFFFF";

}


// Round a number with the specified number of decimal
// 	round(12.48, 1) = 12.5
// 	round(12.48, -1) = 10
function round(number,decimal) {
	return Math.round(number * Math.pow(10,decimal)) / Math.pow(10,decimal);
}


// Round a number with a SI prefix
// return the specified number of digits except useless 0
//		numberToSi(12345.6789, 3) = 12.3k
//		numberToSi(12345.6789, 4) = 12.34k
//    numberToSi(0.00123456789, 4) = 1.234m
//		numberToSi(0.00000012, 10) = 120n
function numberToSi(number,digits) {
	if(!$.isNumeric(number)) {
		console.log("Error, "+number+" is not a number");
		return 0;
	}

	if(undefined === digits) digits = 3;

	var prefix = {
		'7':'Y',
	   '6':'Z',
	   '5':'P',
	   '4':'T',
	   '3':'G',
	   '2':'M',
	   '1':'k',
	   '0':'' ,
	  '-1':'m',
	  '-2':'µ',
	  '-3':'n',
	  '-4':'p',
	  '-5':'f',
	  '-6':'a',
	  '-7':'z',
	  '-8':'y',
  	};

	// reg exp:
	// 	$0: input
	// 	$1: input without power (y.yy for y.yye+xxx)
	// 	$2: integer part of $1
	// 	$3: coma of $1
	// 	$4: decimal part of $1
	// 	$5: power (e+,e- or undefined)
	// 	$6: exponent (xxx for y.yye+xxx)
	var reg = /^-?(([0-9]+)(\.?)([0-9]*))(e[+-])?([0-9]*)/;
	var reg_result = reg.exec(number.toString());
	var i = 0;

	// if the number is a very big float (*10^xxx)
	if(undefined !== reg_result[5] && 'e+' == reg_result[5]) {
		result = reg_result[1] * Math.pow(10,(reg_result[6]%3));
		i = parseInt(reg_result[6]/3);
	}
	// if the number is a very small float (*10^-xxx)
	else if(undefined !== reg_result[5] && 'e-' == reg_result[5]){
		result = reg_result[1] * Math.pow(10,((reg_result[6]%3)*2)%3);
		i = -(parseInt((reg_result[6]-1)/3)+1);
	}
	// if the number is a normal float or integer
	else {
		if(number > 1 || number < -1) {
			i = parseInt((reg_result[2].length-1)/3);
		}
		else {
			var nbzero = reg_result[4].length - parseInt(reg_result[4]).toString().length;
			i = -(parseInt((nbzero)/3) + 1);
		}

		result = Math.abs(number)/Math.pow(10,i*3);

	}

	// round the number
	result = round(result, (digits - parseInt(result).toString().length));
	if(number < 0) result *= -1;

	return result + prefix[i];
}


// Downoad an item passed as a dataURL object
function downloadDataURL(dataURL, name) {
	// Create an invisible <a> and force a download on it
	var temporaryElement = document.createElement('a');
	temporaryElement.style = "display: none";
	temporaryElement.href = dataURL;
	temporaryElement.download = name;
	document.body.appendChild(temporaryElement);
	temporaryElement.click();
	document.body.removeChild(temporaryElement);
	window.URL.revokeObjectURL(dataURL);
}

// Download a data in file
function downloadData(filename, data) {
	var blob = new Blob([data], {type: "octet/stream"});
	var dataURL = window.URL.createObjectURL(blob);
	downloadDataURL(filename, dataURL);
}
