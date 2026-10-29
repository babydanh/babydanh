import { readFileSync } from 'node:fs';
import path from 'node:path';
import PortfolioShell from '../components/PortfolioShell';
import { readmeBlocks } from '../components/experience/readmeBlocks';

export default function HomePage() {
  // The monitor shows the profile README as text. Reading it at build time keeps it in step with the repo.
  const blocks = readmeBlocks(readFileSync(path.join(process.cwd(), 'README.md'), 'utf8'));
  return <PortfolioShell blocks={blocks} />;
}
