const { connectDB, mongoose } = require('../src/db/mongodb');
const { AnalyticsEvent } = require('../src/models');

const run = async () => {
  await connectDB();
  await AnalyticsEvent.syncIndexes();
  console.log('Analytics indexes synced for analytics_events');
};

run()
  .catch((error) => {
    console.error('Analytics index migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
