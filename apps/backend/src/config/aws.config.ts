import { registerAs } from '@nestjs/config';

export const awsConfig = registerAs('aws', () => ({
  region: process.env['AWS_REGION'] ?? 'ap-northeast-1',
  accessKeyId: process.env['AWS_ACCESS_KEY_ID'] ?? 'test',
  secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? 'test',
  s3: {
    bucketName: process.env['AWS_S3_BUCKET'] ?? 'cdcp-photos-dev',
    endpoint: process.env['AWS_S3_ENDPOINT'],
    forcePathStyle: process.env['AWS_S3_FORCE_PATH_STYLE'] === 'true',
    cloudfrontUrl: process.env['AWS_CLOUDFRONT_URL'],
  },
}));
