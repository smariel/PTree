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
