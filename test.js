// -----------------------------------------------------------------------------
// Test file
// run with 'npm test' to check all the functions of PTree before deploying
//   AVA          https://github.com/avajs/ava#
//   Spectron     https://github.com/electron/spectron#-spectron
//   WebdriverIO  http://webdriver.io/api.html
// -----------------------------------------------------------------------------

/* eslint no-console: 0 */
/* eslint no-undef:   0 */

const test = require('ava');
const {Application} = require('spectron');
const Tree = require('./js/class.Tree.js');

test.serial('TEST0: PTree object creation', async t => {
  let ret = await t.context.app.client.execute(() => ptree.tree.getRoot().type);

  t.is(ret.value, 'root');
});

test.serial('TEST1: item creation', async t => {
  let tree = new Tree(false);
  let ret;

  // create some items
  await t.context.app.client.click('#bt_addrootsource');
  await t.context.app.client.click('#bt_addsource');
  await t.context.app.client.click('#bt_addload');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list.length, 4);
  t.is(tree.item_index, 4);
  t.is(tree.item_list[0].type, 'root');
  t.is(tree.item_list[1].type, 'source');
  t.is(tree.item_list[2].type, 'source');
  t.is(tree.item_list[3].type, 'load');


  // remove the loads
  await t.context.app.client.click('#bt_remove');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list.length, 3);
  t.is(tree.item_index, 4);
  t.is(tree.item_list[3], undefined);

  // remove every thing
  await t.context.app.client.click('#bt_clear');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list.length, 1);
  t.is(tree.item_index, 1);
  t.is(tree.item_list[1], undefined);
  t.is(tree.item_list[2], undefined);
  t.is(tree.item_list[3], undefined);
});

test.serial('TEST2: undo/redo', async t => {
  let tree = new Tree(false);
  let ret;

  // create an item
  await t.context.app.client.click('#bt_addrootsource');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list[1].type, 'source');

  // undo
  await t.context.app.client.click('#bt_undo');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list[1], undefined);

  // redo
  await t.context.app.client.click('#bt_redo');
  ret = await t.context.app.client.execute(() => ptree.tree.toString());
  tree.fromString(ret.value);
  t.is(tree.item_list[1].type, 'source');
});

test.serial('TEST3: open file + canvas construction', async t => {
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
  });

  // take a screenshot of the project
  let screenshotBuffer = await t.context.app.client.saveScreenshot();

  // uncomment the following line to generate the "reference" screenshot
  //require('fs').writeFileSync(`${__dirname}/docs/test/test.png`,screenshotBuffer);

  // open a a reference screenshot
  let refshotBuffer = require('fs').readFileSync(`${__dirname}/docs/test/test.png`);

  // compare (in two lines to avoid displaying the buffer in the console on error)
  let screenshotsAreEquals = refshotBuffer.equals(screenshotBuffer);
  t.true(screenshotsAreEquals);
});

test.serial('TEST4: save + new project', async t => {
  // create an item
  await t.context.app.client.click('#bt_addrootsource');

  // save the project
  await t.context.app.client.execute(() => {
    ptree.filePath = `${__dirname}/../test_project.ptree`;
  });
  await t.context.app.client.click('#bt_save');

  // clear the project and reopen it then export the tree
  await t.context.app.client.click('#bt_new');
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../test_project.ptree`);
  });
  let ret = await t.context.app.client.execute(() => ptree.tree.toString());
  let tree = new Tree(false);
  tree.fromString(ret.value);

  // check the tree
  t.is(tree.item_list.length, 2);
  t.is(tree.item_list[1].type, 'source');

  // delete the project file
  require('fs').unlink(`${__dirname}/test_project.ptree`);
});

test.serial('TEST5: canvas manipulation', async t => {
  let ret;

  // open a reference PTree project
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
  });

  // move over a particular item to display infos and check them
  await t.context.app.client.moveToObject('body',375,95);
  ret = await t.context.app.client.execute(() => {
    return {
      vin_typ:  $('#vin_typ' ).text(),
      vin_max:  $('#vin_max' ).text(),
      iin_typ:  $('#iin_typ' ).text(),
      iin_max:  $('#iin_max' ).text(),
      pin_typ:  $('#pin_typ' ).text(),
      pin_max:  $('#pin_max' ).text(),
      vout_typ: $('#vout_typ').text(),
      vout_max: $('#vout_max').text(),
      iout_typ: $('#iout_typ').text(),
      iout_max: $('#iout_max').text(),
      pout_typ: $('#pout_typ').text(),
      pout_max: $('#pout_max').text(),
      loss_typ: $('#loss_typ').text(),
      loss_max: $('#loss_max').text(),
    };
  });
  t.is(ret.value.vin_typ,  '5V');
  t.is(ret.value.vin_max,  '5V');
  t.is(ret.value.iin_typ,  '621mA');
  t.is(ret.value.iin_max,  '1.22A');
  t.is(ret.value.pin_typ,  '3.1W');
  t.is(ret.value.pin_max,  '6.08W');
  t.is(ret.value.vout_typ, '1.8V');
  t.is(ret.value.vout_max, '1.82V');
  t.is(ret.value.iout_typ, '1.5A');
  t.is(ret.value.iout_max, '2.7A');
  t.is(ret.value.pout_typ, '2.7W');
  t.is(ret.value.pout_max, '4.86W');
  t.is(ret.value.loss_typ, '403mW');
  t.is(ret.value.loss_max, '1.21W');

  // click item and check if it was selected
  await t.context.app.client.leftClick('body',655,250);
  ret = await t.context.app.client.execute(() => ptree.canvas.getSelectedItem().id);
  t.is(ret.value, 13);

  // click item, move it down, move it up, chek its positions
  await t.context.app.client.leftClick('body',380,340);
  ret = await t.context.app.client.execute(() => ptree.canvas.getSelectedItem().getParent().childrenID);
  t.is(ret.value[2], 7);
  t.is(ret.value[3], 8);
  await t.context.app.client.click('#bt_up');
  ret = await t.context.app.client.execute(() => ptree.canvas.getSelectedItem().getParent().childrenID);
  t.is(ret.value[2], 8);
  t.is(ret.value[3], 7);
  await t.context.app.client.click('#bt_down');
  ret = await t.context.app.client.execute(() => ptree.canvas.getSelectedItem().getParent().childrenID);
  t.is(ret.value[2], 7);
  t.is(ret.value[3], 8);

  // drag an item over an other and check the style of the "receiver" changed
  await t.context.app.client.moveToObject('body',380,425);
  await t.context.app.client.buttonDown(0);
  await t.context.app.client.moveToObject('body',380,515);
  ret = await t.context.app.client.execute(() => ptree.canvas.fabricCanvas.fabric_obj[10].rect.strokeWidth);
  t.is(ret.value, 7);

  // drop the item and check the id of its new parent
  await t.context.app.client.buttonUp(0);
  ret = await t.context.app.client.execute(() => ptree.tree.getItem(9).getParent().id);
  t.is(ret.value, 10);
});

test.serial('TEST6: total power', async t => {
  // open a reference PTree project
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
  });

  // move over a particular item to display infos and check them
  let ret = await t.context.app.client.execute(() => {
    return {
      totalpower_typ: $('.totalpower.typ').text(),
      totalpower_max: $('.totalpower.max').text(),
      totaleff_typ:   $('.totaleff.typ'  ).text(),
      totaleff_maw:   $('.totaleff.max'  ).text(),
    };
  });
  t.is(ret.value.totalpower_typ,'17.9');
  t.is(ret.value.totalpower_max,'32.1');
  t.is(ret.value.totaleff_typ,  '94');
  t.is(ret.value.totaleff_maw,  '89.8');
});

test.serial('TEST7: options', async t => {
  // open a reference PTree project
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
  });

  // open the config, wait for the animation to end, change the config
  await t.context.app.client.click('#bt_config');
  await wait(500);
  await t.context.app.client.execute(() => {
    $('#config_textsize').val(30).trigger('change');
    $('#config_itemwidth').val(200).trigger('change');
    $('#config_itemheight').val(50).trigger('change');
    $('#config_zoom').val(150).trigger('change');
  });
  await t.context.app.client.click('#config_infoVtyp');
  await t.context.app.client.click('#config_infoVmax');
  await t.context.app.client.click('#config_infoItyp');
  await t.context.app.client.click('#config_infoImax');
  await t.context.app.client.click('#config_infoPtyp');
  await t.context.app.client.click('#config_infoPmax');
  await t.context.app.client.click('#config_name');
  await t.context.app.client.click('#config_ref');
  await t.context.app.client.click('#config_custom1');
  await t.context.app.client.click('#config_alignload');
  await t.context.app.client.click('#config_proportional');
  await t.context.app.client.click('#bottom_close');
  await wait(500);

  // take a screenshot of the project
  let screenshotBuffer = await t.context.app.client.saveScreenshot();
  // uncomment the following line to generate the "reference" screenshot
  //require('fs').writeFileSync(`${__dirname}/docs/test/test2.png`,screenshotBuffer);
  // open a a reference screenshot
  let refshotBuffer = require('fs').readFileSync(`${__dirname}/docs/test/test2.png`);
  // compare (in two lines to avoid displaying the buffer in the console on error)
  let screenshotsAreEquals = refshotBuffer.equals(screenshotBuffer);
  t.true(screenshotsAreEquals);


  // open the config, wait for the animation to end, reset
  await t.context.app.client.click('#bt_config');
  await wait(500);
  await t.context.app.client.click('.mybtn-defaultConfig');
  await t.context.app.client.click('#bottom_close');
  await wait(500);

  // take a screenshot of the project
  screenshotBuffer = await t.context.app.client.saveScreenshot();
  // uncomment the following line to generate the "reference" screenshot
  //require('fs').writeFileSync(`${__dirname}/docs/test/test.png`,screenshotBuffer);
  // open a a reference screenshot
  refshotBuffer = require('fs').readFileSync(`${__dirname}/docs/test/test.png`);
  // compare (in two lines to avoid displaying the buffer in the console on error)
  screenshotsAreEquals = refshotBuffer.equals(screenshotBuffer);
  t.true(screenshotsAreEquals);
});

test.serial('TEST8: sync external spreadsheet', async t => {
  // open a reference PTree project
  await t.context.app.client.execute(() => {
    ptree.open(`${__dirname}/../docs/test/test.ptree`);
  });

  // select a sheet and test the global power values
  let ret = await t.context.app.client.execute(() => {
    ptree.selectSheet(`${__dirname}/../docs/test/test.xlsx`);
    return ptree.tree.getTotalPower();
  });
  t.is(ret.value.typ,17.870114942528737);
  t.is(ret.value.max,32.0675);

  // select an other sheet and test the global power values
  ret = await t.context.app.client.execute(() => {
    ptree.selectSheet(`${__dirname}/../docs/test/test2.xlsx`);
    return ptree.tree.getTotalPower();
  });
  t.is(ret.value.typ,20.610114942528735);
  t.is(ret.value.max,34.6875);
});


/*
  TODO:
  Edit source (all characs & types)
  Edit load (all characs & types)
  About
  Partlist
  Stats
  Popup
*/



// Before each TEST
test.beforeEach(async t => {
  t.context.app = new Application({
    path: require('electron'),
    args: [__dirname]
  });

  await t.context.app.start();
  await wait(500);
});

// after each test, quit PTree
test.afterEach.always(async t => {
  // check the console log for errors
  await t.context.app.client.getMainProcessLogs().then(function (logs) {
    for(let log of logs) {
      // ignore the PTree version warning
      if(/Running PTree v/.test(log)) continue;
      // ignore the WebdriverIO messages
      else if(/Port not available/.test(log)) continue;
      // ignore empty messages
      else if('' == log) continue;

      // fail the test and print the log
      t.fail(`Unexpected console log:\n${log}`);
    }
  });

  // try to get the PID of main process
  let pid;
  try {
    pid = await t.context.app.mainProcess.pid().then((ret) => {return ret;});
  }
  catch (e) {
    // the app was already closed
    return t.fail('Test failed: the app closed before the end of the test');
  }

  // close the renderer window using its own js context
  await t.context.app.client.execute(() => {
    ptree.setSaved();
    window.close();
  });

  await wait(200);

  try {
    // check if PID is running (throw error if not)
    process.kill(pid, 0);
  }
  catch(e) {
    // error catched : the process was not running
    // end the test with success !
    return t.pass();
  }

  // process is still running, stop it and fail the test
  t.context.app.mainProcess.exit(1);
  return t.fail('Test failed: the main window did not close');
});

function wait(millisec) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
    }, millisec);
  });
}
