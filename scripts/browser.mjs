import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function launchBrowser() {
    const profile = mkdtempSync(path.join(os.tmpdir(), 'joseisaudio-seo-'));
    const executable = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome');
    const child = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    const endpoint = await new Promise((resolve, reject) => {
        let stderr = '';
        const timer = setTimeout(() => reject(new Error('Browser startup timeout: ' + stderr)), 15000);
        child.on('error', reject);
        child.stderr.on('data', chunk => {
            stderr += chunk;
            const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) { clearTimeout(timer); resolve(match[1]); }
        });
    });
    const tabs = await (await fetch('http://' + new URL(endpoint).host + '/json/list')).json();
    const socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    let sequence = 0;
    const pending = new Map();
    const errors = [];
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (pending.has(message.id)) {
            const { resolve, reject, timer } = pending.get(message.id);
            pending.delete(message.id); clearTimeout(timer);
            message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
        }
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    });
    const command = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
        pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
        const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
    };
    const waitFor = async expression => {
        for (let i = 0; i < 150; i++) {
            try { if (await evaluate(expression)) return; } catch {}
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        throw new Error('Timed out: ' + expression);
    };
    await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
    await command('Network.setBlockedURLs', { urls: ['https://*'] });
    return { command, evaluate, waitFor, errors, close: async () => {
        try { await command('Browser.close'); } catch {}
        socket.close(); child.kill();
        await new Promise(resolve => setTimeout(resolve, 400));
        if (path.dirname(path.resolve(profile)) === path.resolve(os.tmpdir()) && path.basename(profile).startsWith('joseisaudio-seo-')) {
            try { rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
        }
    } };
}
