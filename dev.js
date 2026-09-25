import { spawn } from 'child_process';
import path from 'path';

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('🎓 Starting ScholarFlow MERN Stack Application...\n');

// Start Express Backend on port 5001
const serverProcess = spawn(npmCmd, ['start'], {
  cwd: path.resolve('server'),
  stdio: 'inherit',
  shell: true
});

// Start Vite React Frontend on port 3000
const clientProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve('client'),
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\nShutting down servers...');
  serverProcess.kill();
  clientProcess.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
