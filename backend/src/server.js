'use strict';
const app = require('./app');
const { initDB } = require('./store');
const port = Number(process.env.PORT || 4000);

(async () => {
  await initDB();
  app.listen(port, '0.0.0.0', () => {
    console.log(`RentPro API running on port ${port}`);
  });
})();
