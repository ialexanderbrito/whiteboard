import { execSync } from 'child_process';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
try {
  const out = execSync(`"${edgePath}" --version`, { encoding: 'utf8' });
  console.log('Edge version:', out.trim());
} catch (e) {
  console.error('Error running Edge:', e.message);
}
