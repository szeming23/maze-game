// Pixel art sprite definitions (16x16 grids)
// Each row is a string of hex color codes, '.' = transparent

const SPRITE_MALE = [
    '....44444444....',
    '...4444444444...',
    '..444444444444..',
    '..44FFDDDDFF44..',
    '..44FFDDDDFF44..',
    '...FDDDDDDDF...',
    '...FDD22D22DF...',
    '...FDDDDDDDF...',
    '...FDDD33DDDF...',
    '....FDDDDDF....',
    '.....FFFFF.....',
    '...3366666633...',
    '..336666666633..',
    '..33.666666.33..',
    '.....5555555....',
    '.....55..55.....',
];

const SPRITE_FEMALE = [
    '....44444444....',
    '...4444444444...',
    '..444444444444..',
    '.4444FDDDF4444.',
    '..44FFDDDDFF44.',
    '..4FDDDDDDDF4..',
    '...FDD22D22DF...',
    '...FDDDDDDDF...',
    '...FDDD33DDDF...',
    '....FDDDDDF....',
    '.....FFFFF.....',
    '...EE666666EE...',
    '..EE66666666EE..',
    '..EEEEEEEEEEEE..',
    '.....EEEEEE.....',
    '.....55..55.....',
];

const SPRITE_HEART = [
    '................',
    '..EE44..44EE....',
    '.E4444EE4444E...',
    'E444444444444E..',
    'E444444444444E..',
    'E444444444444E..',
    '.E4444444444E...',
    '..E44444444E....',
    '...E444444E.....',
    '....E4444E......',
    '.....E44E.......',
    '......EE........',
    '................',
    '................',
    '................',
    '................',
];

const PALETTE = {
    '.': null,       // transparent
    '0': '#000000',
    '1': '#1a1a2e',
    '2': '#222222',  // eyes
    '3': '#cc4444',  // mouth / shirt accent
    '4': '#3366cc',  // hair (male blue) / heart red
    '5': '#5555aa',  // shoes/pants
    '6': '#eecc44',  // shirt/body
    '7': '#77aa55',
    '8': '#88bbff',
    '9': '#99ccff',
    'A': '#aa5533',
    'B': '#bb6644',
    'C': '#ccaa77',
    'D': '#ffcc99',  // skin
    'E': '#e94560',  // pink / dress
    'F': '#ffddbb',  // skin light
};

function drawSprite(ctx, spriteData, x, y, cellSize, palette) {
    const px = cellSize / 16;
    const pal = palette || PALETTE;
    for (let row = 0; row < spriteData.length; row++) {
        const line = spriteData[row];
        for (let col = 0; col < line.length; col++) {
            const ch = line[col];
            const color = pal[ch];
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(x + col * px, y + row * px, Math.ceil(px), Math.ceil(px));
        }
    }
}

function drawSpriteScaled(ctx, spriteData, x, y, size, palette) {
    const px = size / 16;
    const pal = palette || PALETTE;
    for (let row = 0; row < spriteData.length; row++) {
        const line = spriteData[row];
        for (let col = 0; col < line.length; col++) {
            const ch = line[col];
            const color = pal[ch];
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(x + col * px, y + row * px, Math.ceil(px), Math.ceil(px));
        }
    }
}

// Generate female variant with different hair color
const SPRITE_FEMALE_RENDERED = SPRITE_FEMALE; // hair color '4' will be overridden

function getPlayerSprite(gender) {
    return gender === 'male' ? SPRITE_MALE : SPRITE_FEMALE;
}

function getGoalSprite(gender) {
    return gender === 'male' ? SPRITE_FEMALE : SPRITE_MALE;
}

function getPlayerPalette(gender) {
    if (gender === 'male') {
        return { ...PALETTE, '4': '#3366cc' }; // blue hair
    } else {
        return { ...PALETTE, '4': '#cc6633' }; // brown/auburn hair
    }
}

function getGoalPalette(gender) {
    // Goal is opposite gender
    if (gender === 'male') {
        return { ...PALETTE, '4': '#cc6633' }; // female: brown hair
    } else {
        return { ...PALETTE, '4': '#3366cc' }; // male: blue hair
    }
}

function getHeartPalette() {
    return { ...PALETTE, '4': '#e94560', 'E': '#ff6b81' };
}
