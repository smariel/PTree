$(function() {
   const packagejson = require('../package.json');
   const {shell} = require('electron');


   $('.pkg_data').each(function(){
      let pkgdata = packagejson[$(this).data('pkg')];
      $(this).html(pkgdata);
   });

   $('.homepage').click(function(){
      shell.openExternal(packagejson.homepage);
   });

   $('.author').click(function(){
      shell.openExternal('https://github.com/smariel/');
   });

   $('.license').click(function(){
      let license = packagejson[$(this).data('pkg')];
      shell.openExternal(`https://spdx.org/licenses/${license}.html`);
   });


});
