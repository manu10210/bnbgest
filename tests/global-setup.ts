import { seedTestUser } from './helpers/seed-test-user';

async function globalSetup() {
  console.log('\n🌱 Setting up test environment...\n');
  
  try {
    await seedTestUser();
    console.log('\n✅ Test environment ready!\n');
  } catch (error) {
    console.error('\n❌ Failed to setup test environment:', error);
    throw error;
  }
}

export default globalSetup;
