const {app}=require('electron');
if(!process.env.QUINTAL_TEST_PROFILE)throw Error('Test profile is required');
app.setPath('appData',process.env.QUINTAL_TEST_PROFILE);
require('../electron.cjs');
