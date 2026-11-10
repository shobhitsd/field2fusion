import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();
const svg=await readFile(new URL('../public/icon.svg',import.meta.url),'utf8');
for(const size of [192,512]){await page.setViewportSize({width:size,height:size});await page.setContent(`<style>html,body{margin:0;width:100%;height:100%}svg{width:100%;height:100%}</style>${svg}`);await page.screenshot({path:fileURLToPath(new URL(`../public/icon-${size}.png`,import.meta.url)),omitBackground:true});}
await browser.close();
