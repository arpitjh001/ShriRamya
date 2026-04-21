let readyPromise = null;

const ensureReady = async () => {
  if (!readyPromise) {
    readyPromise = (async () => {
      const { connectDB } = require('../../backend_node/src/db/mongodb');
      const { seedDatabase } = require('../../backend_node/src/db/seed');
      await connectDB();
      if (process.env.SEED_DATABASE === 'true') {
        await seedDatabase();
      }
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
    const app = require('../../backend_node/src/app');
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
