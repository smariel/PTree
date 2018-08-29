// -----------------------------------------------------------------------------
// About window renderer script
// -----------------------------------------------------------------------------

// Security : disable window.eval() in this rendrer
window.eval = global.eval = function () {
  throw new Error(`This application does not support window.eval().`);
};

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
