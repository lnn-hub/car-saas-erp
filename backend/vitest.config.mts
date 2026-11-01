import { defineConfig } from 'vitest/config';

// Тест тусдаа сан ашиглана. Нэрэнд "test" эсвэл "ci" байхгүй санг global-setup устгахаас татгалзана.
const DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/car_saas_test';
process.env.DATABASE_URL = DATABASE_URL;

export default defineConfig({
  test: {
    globalSetup: './tests/global-setup.ts',
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false, // бүх файл нэг санг хуваалцана
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL,
      JWT_SECRET: 'test-secret-test-secret-test-secret-123',
      DEMO_LOGIN: '',
      FRONTEND_URL: 'http://localhost:3000',
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
    },
  },
});
