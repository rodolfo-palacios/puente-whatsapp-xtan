const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const express = require('express');
const app = express();
app.use(express.json());

async function conectarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_colectivo');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });
    
    // Le damos 15 segundos completos para que la conexión a internet de Render se estabilice
    setTimeout(async () => {
        if (!sock.authState.creds.registered) {
            // TU NÚMERO DE TELÉFONO DEL COLECTIVO (Asegúrate de que sea el correcto)
            const numeroTelefono = "5219191286566"; 
            
            try {
                console.log("Solicitando código de vinculación a WhatsApp...");
                const code = await sock.requestPairingCode(numeroTelefono);
                console.log("=========================================");
                console.log(`👉 TU CÓDIGO DE VINCULACIÓN ES: ${code}`);
                console.log("=========================================");
            } catch (err) {
                console.log("Error al generar código, reintentando en breve:", err.message);
            }
        }
    }, 15000); 
    
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if(connection === 'close') {
            console.log('Conexión cerrada, intentando reconectar...');
            // Pequeña pausa antes de reconectar para evitar saturar el servidor
            setTimeout(() => conectarWhatsApp(), 5000);
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
app.listen(PORT, () => console.log(`Puente escuchando en puerto ${PORT}`));
