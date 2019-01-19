var version      = '';
var download_url = '';
var platform     = 'win';
var platform_req = 'Windows 7';
var mail_name    = 'sylvain.mariel';
var mail_domain  = 'otmax.fr';

// get the user platform and the minimum system requirement
if(navigator.platform.match(/win/i) !== null) {
  platform = 'win';
  platform_req = 'Windows 7';
}
else if(navigator.platform.match(/mac/i) !== null) {
  platform = 'mac';
  platform_req = 'macOS 10.9';
}
else if(navigator.platform.match(/linux/i) !== null) {
  platform = 'linux';
  platform_req = 'Ubuntu 12.04';
}



// if DOM is ready, print the data
$(function(){
  // Email Anti Spam
  $('.email').prop('href','mailto:'+mail_name+'@'+mail_domain+'?subject=Contact PTree');

  // print the minimum system requirement
  $('.dl-platform a').prepend(platform_req);

  // Get the latest release from the PTree repo using GitHub REST API
  // https://developer.github.com/v3/repos/releases/
  $.get('https://api.github.com/repos/smariel/ptree/releases/latest', function(github_data){
    // get the latest version and print it
    version = github_data.tag_name.substr(1);
    $('.dl-version a').text(`Version ${version}`);

    // get download url accoring to the user platform
    for(var i=0; i<github_data.assets.length; i++) {
      if(new RegExp(platform,'i').test(github_data.assets[i].name)){
        download_url = github_data.assets[i].browser_download_url;
        break;
      }
    }
    // print the correct url
    $('.download-button > a, .dl-platform a').prop('href',download_url);

    $('.dl-item').show();
  });
});
