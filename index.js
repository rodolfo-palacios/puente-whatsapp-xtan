const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const app = express();
app.use(express.json());

let sock = null;

async function conectarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_colectivo');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: require('pino')({ level: 'silent' }) // Silenciamos los logs masivos para ver claro el código
    });
    
    // Solicitar el código de forma segura una sola vez
    if (!sock.authState.creds.registered) {
        const numeroTelefono = "5219191286566"; // Asegúrate de que este sea el número del celular
        
        setTimeout(async () => {
            try {
                console.log("-----------------------------------------");
                console.log(`📡 Solicitando código para el número: ${numeroTelefono}`);
                const code = await sock.requestPairingCode(numeroTelefono);
                console.log("=========================================");
                console.log(`👉 TU CÓDIGO DE VINCULACIÓN ES: ${code}`);
                console.log("=========================================");
            } catch (err) {
                console.log("❌ No se pudo generar el código en este intento:", err.message);
            }
        }, 10000); // 10 segundos para dar estabilidad inicial
    }
    
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const deberiaReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔄 Conexión cerrada por el servidor. ¿Intentar reconectar?:', deberiaReconectar);
            
            if (deberiaReconectar) {
                // Esperamos 7 segundos antes de reconectar para no saturar a WhatsApp
                setTimeout(() => conectarWhatsApp(), 7000);
            }
        } else if (connection === 'open') {
            console.log('✅ ¡WhatsApp conectado exitosamente para el Colectivo Xtan!');
        }
    });
}

// Rutas de Express
app.post('/enviar-alerta', async (req, res) => {
    const { telefono, mensaje } = req.body;
    if (!sock) return res.status(500).json({ error: "El servidor de WhatsApp no está inicializado" });
    
    try {
        const idJid = `${telefono}@s.whatsapp.net`;
        await sock.sendMessage(idJid, { text: mensaje });
        res.status(200).json({ status: 'Alerta enviada a WhatsApp' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

conectarWhatsApp();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Puente escuchando en puerto ${PORT}`));
