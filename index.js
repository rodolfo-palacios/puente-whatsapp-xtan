const { default: makeWASocket, useMultiFileAuthState, Delay } = require('@whiskeysockets/baileys');
const express = require('express');
const app = express();
app.use(express.json());

async function conectarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_colectivo');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // Desactivamos el QR problemático
    });
    
    // Si no está conectado, le pedimos un código de vinculación de texto
    if (!sock.authState.creds.registered) {
        // CAMBIA ESTE NÚMERO: Pon el número de teléfono del colectivo con su código de país (Ej: 521919XXXXXX)
        const numeroTelefono = "5219191286566"; 
        
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(numeroTelefono);
                console.log("=========================================");
                console.log(`👉 TU CÓDIGO DE VINCULACIÓN ES: ${code}`);
                console.log("=========================================");
            } catch (err) {
                console.log("Error al generar código:", err.message);
            }
        }, 5000);
    }
    
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if(connection === 'close') {
            console.log('Conexión cerrada, intentando reconectar...');
            conectarWhatsApp();
        } else if(connection === 'open') {
            console.log('¡WhatsApp conectado exitosamente para el Colectivo Xtan!');
        }
    });
    
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
