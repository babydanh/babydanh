const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const basePath = isGitHubPages ? '/babydanh' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
