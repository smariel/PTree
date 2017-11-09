$(function() {
   const packagejson = require('../package.json');
   const {shell} = require('electron');


   $('.pkg_data').each(function(){
      let pkgdata = $(this).data('pkg');
      $(this).html(packagejson[pkgdata]);
   });

   $('.homepage').click(function(){
      shell.openExternal(packagejson.homepage);
   });

   $('.author').click(function(){
      shell.openExternal('https://github.com/smariel/');
   });
});
