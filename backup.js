import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backup-Verzeichnis erstellen, falls es nicht existiert
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

// Datum für den Backup-Namen
const date = new Date().toISOString().replace(/[:.]/g, '-');
const output = fs.createWriteStream(path.join(backupDir, `backup-${date}.zip`));
const archive = archiver('zip', { zlib: { level: 9 } });

// Event-Handler
output.on('close', () => {
    console.log(`Backup erfolgreich erstellt: ${archive.pointer()} bytes`);
});

archive.on('error', (err) => {
    throw err;
});

// Archive mit Output verbinden
archive.pipe(output);

// Wichtige Verzeichnisse und Dateien hinzufügen
archive.directory(path.join(__dirname, 'src'), 'src');
archive.directory(path.join(__dirname, 'public'), 'public');
archive.file(path.join(__dirname, 'package.json'), { name: 'package.json' });
archive.file(path.join(__dirname, 'package-lock.json'), { name: 'package-lock.json' });

// Archive finalisieren
archive.finalize();

// Alte Backups löschen (älter als 7 Tage)
const files = fs.readdirSync(backupDir);
const now = new Date();
files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24); // Alter in Tagen
    
    if (fileAge > 7) {
        fs.unlinkSync(filePath);
        console.log(`Altes Backup gelöscht: ${file}`);
    }
}); 