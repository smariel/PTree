// Framworks and libraries
window.$ = window.jQuery = require('jquery');
require('mousetrap');
require('bootstrap');
require('fabric');


// when jQuery is ready
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
