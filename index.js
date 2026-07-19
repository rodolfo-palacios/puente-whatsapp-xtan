const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const app = express();
app.use(express.json());

async function conectarWhatsApp() {
    // Guarda la sesión en una carpeta para mantener la conexión activa
    const { state, saveCreds } = await useMultiFileAuthState('sesion_colectivo');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true // Esto pintará el QR en la consola de Render
    });
    
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if(qr) {
            console.log("=========================================");
            console.log("¡CÓDIGO QR GENERADO! Revisa los logs de Render para escanearlo.");
            console.log("=========================================");
        }
        if(connection === 'close') {
            console.log('Conexión cerrada, intentando reconectar...');
            conectarWhatsApp();
        } else if(connection === 'open') {
            console.log('¡WhatsApp conectado exitosamente para el Colectivo Xtan!');
        }
    });
    
    // Ruta que recibirá el reporte desde tu PHP
    app.post('/enviar-alerta', async (req, res) => {
        const { telefono, mensaje } = req.body;
        try {
            const idJid = `${telefono}@s.whatsapp.net`;
            await sock.sendMessage(idJid, { text: mensaje });
            res.status(200).json({ status: 'Alerta enviada a WhatsApp' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}

conectarWhatsApp();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Puente escuchando en puerto ${PORT}`));
