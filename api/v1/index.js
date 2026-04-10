const app = require('../../backend_node/src/app');
const { connectDB } = require('../../backend_node/src/db/mongodb');
const { seedDatabase } = require('../../backend_node/src/db/seed');

let readyPromise = null;

const ensureReady = async () => {
  if (!readyPromise) {
    readyPromise = (async () => {
      await connectDB();
      await seedDatabase();
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }

  await readyPromise;
};

module.exports = async (req, res) => {
  try {
    await ensureReady();
    return app(req, res);
  } catch (error) {
    console.error('Serverless API bootstrap failed:', error);
    return res.status(500).json({
      success: false,
      message: 'API bootstrap failed',
      error: error.message,
    });
  }
};
