import {copyFileSync,existsSync} from 'node:fs';
if(existsSync('submission/venomlink-walkthrough.mp4'))copyFileSync('submission/venomlink-walkthrough.mp4','public/venomlink-walkthrough.mp4');
