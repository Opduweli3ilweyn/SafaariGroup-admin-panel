const fs = require('fs');
const src = 'C:/Users/hp/.gemini/antigravity/brain/92527b9c-d216-40fb-8723-250a5a570930/minibus_login_bg_1772748498571.png';
const dest = 'C:/Users/hp/Documents/travel-admin-panel/src/assets/images/minibus-bg.png';

try {
    fs.copyFileSync(src, dest);
    console.log('Copy successful.');
} catch (err) {
    console.error('Error copying file:', err);
}
