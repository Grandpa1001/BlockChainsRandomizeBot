require('dotenv').config();
const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');
const https = require('https');
const fs = require('fs');
const sharp = require('sharp');

const bot = new Telegraf(process.env.API_KEY);

bot.start((ctx) => ctx.reply('Welcome'))
bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on(message('sticker'), (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply('Hey there'))

// Reakcja na wiadomość zawierającą zdjęcie
bot.on('photo', async (ctx) => {
    try {
        // Pobierz informacje o zdjęciu
        const photo = ctx.message.photo;
        // Pobierz identyfikator największej wersji zdjęcia (zwykle to będzie ostatnie zdjęcie)
        const photoId = photo[photo.length - 1].file_id;
        // Pobierz informacje o pliku na podstawie jego identyfikatora
        const fileInfo = await ctx.telegram.getFile(photoId);
        // Pobierz ścieżkę do pliku
        const filePath = fileInfo.file_path;
        // Pobierz zawartość pliku zdjęcia
        const photoBuffer = await downloadFile(filePath);
        // Zapisz zawartość pliku do nowego pliku
        fs.writeFileSync('photo.jpg', photoBuffer);

        // Manipulacja kolorem - ciemniejsze o 10%
        const darkerImageBuffer = await darkenImage('photo.jpg');
        // Zapisz zmodyfikowane zdjęcie do pliku
        fs.writeFileSync('photo_darker.jpg', darkerImageBuffer);

        // Ponownie wyślij zdjęcie z nową nazwą
        await ctx.replyWithPhoto({ source: 'photo_darker.jpg' });

        // Usuń tymczasowe pliki
        fs.unlinkSync('photo.jpg');
        fs.unlinkSync('photo_darker.jpg');
    } catch (error) {
        console.error('Error handling photo:', error);
    }
});

bot.launch();

// Włącz łagodne zatrzymywanie
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Funkcja do pobierania zawartości pliku za pomocą HTTP
function downloadFile(fileUrl) {
    return new Promise((resolve, reject) => {
        https.get(`https://api.telegram.org/file/bot${process.env.API_KEY}/${fileUrl}`, (response) => {
            let data = [];
            response.on('data', (chunk) => {
                data.push(chunk);
            });
            response.on('end', () => {
                resolve(Buffer.concat(data));
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Funkcja do przyciemniania obrazu o określony procent
async function darkenImage(filePath) {
    const imageBuffer = fs.readFileSync(filePath);
    const darkerImageBuffer = await sharp(imageBuffer)
        .modulate({
            brightness: 1, // Ustaw jasność na 100 - percentage
        })
        .toBuffer();
    return darkerImageBuffer;
}