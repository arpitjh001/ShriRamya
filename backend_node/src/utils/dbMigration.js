const runMigrations = async () => {
  console.log('SQL Migrations deactivated (MongoDB mode)');
  return true;
};

const rollbackMigration = async (migrationName) => {
  console.log('SQL Migrations deactivated (MongoDB mode)');
  return true;
};

module.exports = {
  runMigrations,
  rollbackMigration,
  migrations: []
};
