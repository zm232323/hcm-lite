// This runs in the same process as the test runner, before any tests
process.env.NODE_ENV = 'test';
// Set placeholder values - testHelpers.js will override MONGO_URI with memory server URI
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests';
process.env.CLIENT_URL = 'http://localhost:5173';
