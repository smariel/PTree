// Framworks and libraries
window.$ = window.jQuery = require('jquery');

// When jQuery is ready
$(() => {
   const packagejson = require('../package.json');
   const {shell} = require('electron');

   $('.author' ).html(packagejson.name);
   $('.version').html(packagejson.description);
   $('.author' ).html(packagejson.author.name);
   $('.version').html(packagejson.version);
   $('.license').html(packagejson.license);

   $('.homepage').click(() => {
      shell.openExternal(packagejson.homepage);
   });

   $('.author').click(() => {
      shell.openExternal('https://github.com/smariel/');
   });

   $('.license').click((evt) => {
      let license = packagejson[$(evt.currentTarget).data('pkg')];
      shell.openExternal(`https://spdx.org/licenses/${license}.html`);
   });
});
