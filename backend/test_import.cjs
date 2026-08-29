const app_1 = require('./dist/app');
console.log('app:', typeof app_1.app, app_1.app ? 'exists' : 'undefined');
console.log('listen:', typeof app_1.app?.listen);